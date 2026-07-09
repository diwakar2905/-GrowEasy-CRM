import { genAI, GEMINI_MODEL_NAME } from '../config/gemini';
import { SYSTEM_PROMPT, getExtractionUserPrompt, getSummaryUserPrompt } from '../prompts/extractor.prompt';
import { DETECTOR_SYSTEM_PROMPT, getDetectorUserPrompt } from '../prompts/detector.prompt';
import { AILeadResult, RawCSVRow, AIDetectedSource } from '../types/lead';

const extractionResponseSchema: any = {
  type: 'array',
  description: "List of processed leads from the input batch",
  items: {
    type: 'object',
    properties: {
      index: {
        type: 'integer',
        description: "The original index of the record in the input list, starting at 0",
      },
      extracted_data: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          country_code: { type: 'string' },
          mobile_without_country_code: { type: 'string' },
          company: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          country: { type: 'string' },
          lead_owner: { type: 'string' },
          crm_status: { type: 'string' },
          crm_note: { type: 'string' },
          data_source: { type: 'string' },
          possession_time: { type: 'string' },
          description: { type: 'string' }
        },
        required: [
          "name", "email", "country_code", "mobile_without_country_code",
          "company", "city", "state", "country", "lead_owner",
          "crm_status", "crm_note", "data_source", "possession_time", "description"
        ]
      },
      confidence: {
        type: 'number',
        description: "Confidence score between 0.0 and 1.0",
      },
      explanation: {
        type: 'string',
        description: "Reasoning for the column-to-field mapping decisions",
      },
      detected_mapping: {
        type: 'object',
        description: "Mapping of original CSV column headers to the target CRM fields",
      }
    },
    required: ["index", "extracted_data", "confidence", "explanation", "detected_mapping"]
  }
};

export class GeminiService {
  /**
   * Processes a batch of raw records using Gemini 1.5 Flash.
   */
  public static async extractBatch(
    records: RawCSVRow[],
    retryCount = 0,
    maxRetries = 3
  ): Promise<AILeadResult[]> {
    try {
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL_NAME,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: extractionResponseSchema,
          temperature: 0.1, // low temperature for high determinism and schema adherence
        }
      });

      const userPrompt = getExtractionUserPrompt(records);
      const result = await model.generateContent(userPrompt);
      const responseText = result.response.text();

      if (!responseText) {
        throw new Error("Received empty response from Gemini API.");
      }

      const parsedResults = JSON.parse(responseText) as AILeadResult[];
      return parsedResults;
    } catch (error: any) {
      console.error(`❌ Error in Gemini extraction (Attempt ${retryCount + 1}/${maxRetries + 1}):`, error.message);
      
      if (retryCount < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`⏳ Retrying batch in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.extractBatch(records, retryCount + 1, maxRetries);
      }
      
      throw new Error(`Gemini batch extraction failed after ${maxRetries + 1} attempts. Original error: ${error.message}`);
    }
  }

  /**
   * Detects the originating B2B platform source of the CSV file.
   */
  public static async detectSource(
    headers: string[],
    sampleRows: RawCSVRow[],
    retryCount = 0,
    maxRetries = 2
  ): Promise<AIDetectedSource> {
    try {
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL_NAME,
        systemInstruction: DETECTOR_SYSTEM_PROMPT,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              detected_source: {
                type: 'object',
                properties: {
                  source: { type: 'string' },
                  confidence: { type: 'number' },
                  reasoning: { type: 'string' }
                },
                required: ["source", "confidence", "reasoning"]
              },
              detected_language: { type: 'string' },
              detected_date_format: { type: 'string' },
              detected_phone_format: { type: 'string' },
              ignored_columns: {
                type: 'array',
                items: { type: 'string' }
              },
              duplicate_check_columns: {
                type: 'array',
                items: { type: 'string' }
              },
              potential_missing_info: { type: 'string' },
              column_mappings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    original_column: { type: 'string' },
                    crm_field: { type: 'string' },
                    confidence: { type: 'number' },
                    reasoning: { type: 'string' }
                  },
                  required: ["original_column", "crm_field", "confidence", "reasoning"]
                }
              }
            },
            required: [
              "detected_source", 
              "detected_language", 
              "detected_date_format", 
              "detected_phone_format", 
              "ignored_columns", 
              "duplicate_check_columns", 
              "potential_missing_info", 
              "column_mappings"
            ]
          } as any,
          temperature: 0.1,
        }
      });

      const userPrompt = getDetectorUserPrompt(headers, sampleRows);
      const result = await model.generateContent(userPrompt);
      const responseText = result.response.text();

      if (!responseText) {
        throw new Error("Received empty source detection response from Gemini API.");
      }

      const parsedJson = JSON.parse(responseText);
      const resultData: AIDetectedSource = {
        source: parsedJson.detected_source.source,
        confidence: parsedJson.detected_source.confidence,
        reasoning: parsedJson.detected_source.reasoning,
        language: parsedJson.detected_language,
        dateFormat: parsedJson.detected_date_format,
        phoneFormat: parsedJson.detected_phone_format,
        ignoredColumns: parsedJson.ignored_columns || [],
        duplicateColumns: parsedJson.duplicate_check_columns || [],
        potentialMissingInfo: parsedJson.potential_missing_info || '',
        columnMappings: parsedJson.column_mappings.map((m: any) => ({
          originalColumn: m.original_column,
          crmField: m.crm_field,
          confidence: m.confidence,
          reasoning: m.reasoning
        }))
      };

      return resultData;
    } catch (error: any) {
      console.error(`❌ Error in Gemini source detection (Attempt ${retryCount + 1}/${maxRetries + 1}):`, error.message);
      
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.detectSource(headers, sampleRows, retryCount + 1, maxRetries);
      }

      // Safe fallback on persistent failure
      return {
        source: "Unknown CSV",
        confidence: 0.5,
        reasoning: `AI source analysis failed: ${error.message}`,
        language: 'English',
        dateFormat: 'Unknown',
        phoneFormat: 'Unknown',
        ignoredColumns: [],
        duplicateColumns: [],
        potentialMissingInfo: 'No warning information available.',
        columnMappings: headers.map(h => ({
          originalColumn: h,
          crmField: '',
          confidence: 0,
          reasoning: 'Fallback due to detection error'
        }))
      };
    }
  }

  /**
   * Generates a dynamic AI written summary paragraph for the completed import job.
   */
  public static async generateSummary(stats: {
    totalCount: number;
    importedCount: number;
    skippedCount: number;
    duplicateCount: number;
    commonCities: string[];
    commonStates: string[];
    topStatus: string;
    commonCompany: string;
    dataQuality: string;
  }): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL_NAME,
        generationConfig: {
          temperature: 0.7,
        }
      });
      const prompt = getSummaryUserPrompt(stats);
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (e: any) {
      console.error("❌ Failed to generate import summary using Gemini:", e);
      return `${stats.importedCount} records were processed successfully. Overall data quality is ${stats.dataQuality.toLowerCase()}.`;
    }
  }
}
