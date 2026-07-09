import Papa from 'papaparse';
import { RawCSVRow } from '../types/lead';

export class CSVService {
  /**
   * Parses CSV content into raw JSON rows.
   * @param csvContent The raw CSV content as a string or buffer.
   */
  public static parse(csvContent: string): Promise<{ data: RawCSVRow[]; headers: string[] }> {
    return new Promise((resolve, reject) => {
      Papa.parse<RawCSVRow>(csvContent, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          if (results.errors.length > 0) {
            // Log warning but continue if we got data
            console.warn("⚠️ PapaParse warnings:", results.errors);
          }
          resolve({
            data: results.data,
            headers: results.meta.fields || [],
          });
        },
        error: (error: any) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        },
      });
    });
  }
}
