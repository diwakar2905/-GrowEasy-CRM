import { CSVService } from './csv.service';
import { GeminiService } from './gemini.service';
import { validateLead } from '../validators/lead.validator';
import { RawCSVRow, ProcessedLeadResult, ImportJobSummary } from '../types/lead';

export class BatchService {
  private static BATCH_SIZE = 25;

  /**
   * Processes a CSV import job, sending progress events via a callback.
   */
  public static async processImport(
    csvContent: string,
    customMappings: Record<string, string> | undefined,
    onProgress: (event: { type: string; payload: any }) => void
  ): Promise<ImportJobSummary> {
    const startTime = Date.now();

    // 1. Parsing CSV
    onProgress({ type: 'parsing', payload: { message: 'Parsing CSV data' } });
    const { data: rawRows } = await CSVService.parse(csvContent);
    const totalRows = rawRows.length;

    if (totalRows === 0) {
      throw new Error("The uploaded CSV file is empty.");
    }

    // Pre-map rows if user defined custom mappings
    let processedRows: RawCSVRow[] = rawRows;
    if (customMappings) {
      processedRows = rawRows.map(row => {
        const newRow: RawCSVRow = {};
        for (const [key, val] of Object.entries(row)) {
          const target = customMappings[key];
          if (target && target !== '') {
            newRow[target] = val;
          } else {
            // Keep original key as a backup
            newRow[key] = val;
          }
        }
        return newRow;
      });
    }

    // 2. Preparing Batches
    onProgress({ type: 'preparing_batches', payload: { message: 'Chunking data into batches of 25' } });
    const rawChunks: RawCSVRow[][] = [];
    const processedChunks: RawCSVRow[][] = [];
    
    for (let i = 0; i < totalRows; i += this.BATCH_SIZE) {
      rawChunks.push(rawRows.slice(i, i + this.BATCH_SIZE));
      processedChunks.push(processedRows.slice(i, i + this.BATCH_SIZE));
    }

    const totalBatches = rawChunks.length;
    const importedLeads: ProcessedLeadResult[] = [];
    const skippedLeads: ProcessedLeadResult[] = [];
    let totalConfidence = 0;
    let processedRecordsCount = 0;

    // 3. Sequential Batch Processing
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchRawRows = rawChunks[batchIndex];
      const batchProcessedRows = processedChunks[batchIndex];
      const startRowIndex = batchIndex * this.BATCH_SIZE;

      const progressPercent = Math.round((batchIndex / totalBatches) * 100);
      onProgress({
        type: 'processing_batch',
        payload: {
          batchIndex: batchIndex + 1,
          totalBatches,
          percent: progressPercent,
          message: `AI extracting columns for batch ${batchIndex + 1} of ${totalBatches}`
        }
      });

      let aiResults: any[] = [];
      let batchErrorOccurred = false;
      let batchErrorMessage = '';

      try {
        aiResults = await GeminiService.extractBatch(batchProcessedRows);
      } catch (err: any) {
        batchErrorOccurred = true;
        batchErrorMessage = err.message || 'AI extraction failed';
        console.error(`❌ Batch ${batchIndex + 1} extraction failure:`, batchErrorMessage);
      }

      // 4. Validation and Normalization per row in the batch
      onProgress({
        type: 'validating',
        payload: {
          message: `Validating and mapping records for batch ${batchIndex + 1}`
        }
      });

      for (let i = 0; i < batchRawRows.length; i++) {
        const rawRowIndex = startRowIndex + i;
        const rawRow = batchRawRows[i];

        if (batchErrorOccurred) {
          // If the AI failed the whole batch, skip all rows in this batch
          skippedLeads.push({
            index: rawRowIndex,
            isValid: false,
            lead: null,
            errors: [`AI processing error for this batch: ${batchErrorMessage}`],
            rawRow,
            confidence: 0,
            explanation: 'Batch processing failed',
            detectedMapping: customMappings || {}
          });
          continue;
        }

        // Find the AI result corresponding to this relative index (i)
        const aiResult = aiResults.find(
          (r: any) => r.index === i || r.index === rawRowIndex
        );

        if (!aiResult) {
          skippedLeads.push({
            index: rawRowIndex,
            isValid: false,
            lead: null,
            errors: ['AI failed to output extracted data for this row'],
            rawRow,
            confidence: 0,
            explanation: 'AI extraction missing this record',
            detectedMapping: customMappings || {}
          });
          continue;
        }

        // Validate the AI extracted data with Zod
        const validation = validateLead(aiResult.extracted_data);
        
        // Merge user mapping overrides as the definitive mapping
        const finalMapping = customMappings 
          ? { ...aiResult.detected_mapping, ...customMappings }
          : (aiResult.detected_mapping || {});

        const processedResult: ProcessedLeadResult = {
          index: rawRowIndex,
          isValid: validation.isValid,
          lead: validation.lead,
          errors: validation.errors,
          rawRow,
          confidence: aiResult.confidence ?? 0.5,
          explanation: aiResult.explanation || '',
          detectedMapping: finalMapping
        };

        if (validation.isValid) {
          importedLeads.push(processedResult);
          totalConfidence += processedResult.confidence;
          processedRecordsCount++;
        } else {
          skippedLeads.push(processedResult);
        }
      }

      // Add a slight cooling-off delay between sequential API requests to stay within rate limits
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const endTime = Date.now();
    const processingTimeMs = endTime - startTime;
    const averageConfidence = processedRecordsCount > 0 
      ? Math.round((totalConfidence / processedRecordsCount) * 100) / 100 
      : 0;

    // Deduplication check
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    let duplicateCount = 0;

    for (const leadResult of importedLeads) {
      if (!leadResult.lead) continue;
      const email = leadResult.lead.email?.toLowerCase().trim();
      const phone = leadResult.lead.mobile_without_country_code?.trim();
      
      let isDup = false;
      if (email && seenEmails.has(email)) isDup = true;
      if (phone && seenPhones.has(phone)) isDup = true;

      if (isDup) {
        duplicateCount++;
      } else {
        if (email) seenEmails.add(email);
        if (phone) seenPhones.add(phone);
      }
    }

    // Compile aggregates frequency maps
    const cityMap: Record<string, number> = {};
    const stateMap: Record<string, number> = {};
    const companyMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};

    for (const leadResult of importedLeads) {
      if (!leadResult.lead) continue;
      const city = leadResult.lead.city?.trim();
      if (city) cityMap[city] = (cityMap[city] || 0) + 1;

      const state = leadResult.lead.state?.trim();
      if (state) stateMap[state] = (stateMap[state] || 0) + 1;

      const company = leadResult.lead.company?.trim();
      if (company) companyMap[company] = (companyMap[company] || 0) + 1;

      const status = leadResult.lead.crm_status?.trim();
      if (status) statusMap[status] = (statusMap[status] || 0) + 1;
    }

    const getTopKey = (map: Record<string, number>): string => {
      let topKey = '';
      let topVal = -1;
      for (const [k, v] of Object.entries(map)) {
        if (v > topVal) {
          topVal = v;
          topKey = k;
        }
      }
      return topKey;
    };

    const mostCommonCity = getTopKey(cityMap) || 'N/A';
    const mostCommonState = getTopKey(stateMap) || 'N/A';
    const mostCommonCompany = getTopKey(companyMap) || 'N/A';
    const topLeadStatus = getTopKey(statusMap) || 'N/A';

    // Calculate Data Quality Grade
    let estimatedDataQuality = 'Poor';
    if (averageConfidence >= 0.90 && skippedLeads.length / totalRows <= 0.15) {
      estimatedDataQuality = 'Excellent';
    } else if (averageConfidence >= 0.75 && skippedLeads.length / totalRows <= 0.30) {
      estimatedDataQuality = 'Good';
    } else if (averageConfidence >= 0.60) {
      estimatedDataQuality = 'Fair';
    } else {
      estimatedDataQuality = 'Poor';
    }

    // Get top 3 cities and states for the AI summary context
    const getTopKeys = (map: Record<string, number>, limit = 3): string[] => {
      return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(entry => entry[0]);
    };
    const commonCities = getTopKeys(cityMap);
    const commonStates = getTopKeys(stateMap);

    // Call Gemini to write the dynamic summary paragraph
    const aiSummary = await GeminiService.generateSummary({
      totalCount: totalRows,
      importedCount: importedLeads.length,
      skippedCount: skippedLeads.length,
      duplicateCount,
      commonCities,
      commonStates,
      topStatus: topLeadStatus,
      commonCompany: mostCommonCompany,
      dataQuality: estimatedDataQuality
    });

    const summary: ImportJobSummary = {
      totalRows,
      importedCount: importedLeads.length,
      skippedCount: skippedLeads.length,
      duplicateCount,
      averageConfidence,
      processingTimeMs,
      mostCommonCity,
      mostCommonState,
      topLeadStatus,
      mostCommonCompany,
      estimatedDataQuality,
      aiSummary,
      importedLeads,
      skippedLeads
    };

    onProgress({
      type: 'completed',
      payload: summary
    });

    return summary;
  }
}
