"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSVService = void 0;
const papaparse_1 = __importDefault(require("papaparse"));
class CSVService {
    /**
     * Parses CSV content into raw JSON rows.
     * @param csvContent The raw CSV content as a string or buffer.
     */
    static parse(csvContent) {
        return new Promise((resolve, reject) => {
            papaparse_1.default.parse(csvContent, {
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
                error: (error) => {
                    reject(new Error(`Failed to parse CSV: ${error.message}`));
                },
            });
        });
    }
}
exports.CSVService = CSVService;
