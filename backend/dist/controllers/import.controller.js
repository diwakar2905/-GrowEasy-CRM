"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportController = exports.fileCache = void 0;
const crypto_1 = __importDefault(require("crypto"));
const csv_service_1 = require("../services/csv.service");
const batch_service_1 = require("../services/batch.service");
const gemini_service_1 = require("../services/gemini.service");
exports.fileCache = new Map();
class ImportController {
    /**
     * Handles file upload, parses CSV briefly to count rows/cols, caches file, and returns metadata.
     */
    static async uploadFile(req, res, next) {
        try {
            if (!req.file) {
                res.status(400).json({ success: false, error: "No CSV file was uploaded." });
                return;
            }
            const fileBuffer = req.file.buffer;
            const csvString = fileBuffer.toString('utf-8');
            // Parse with PapaParse to verify CSV structure and get metadata
            const { data, headers } = await csv_service_1.CSVService.parse(csvString);
            const fileId = crypto_1.default.randomUUID();
            const cachedFile = {
                name: req.file.originalname,
                content: csvString,
                size: req.file.size,
                rowsCount: data.length,
                colsCount: headers.length,
                uploadedAt: new Date().toISOString(),
            };
            // Store in memory cache
            exports.fileCache.set(fileId, cachedFile);
            // Automatically clean up file from cache after 30 minutes to prevent memory leaks
            setTimeout(() => {
                if (exports.fileCache.has(fileId)) {
                    console.log(`🧹 Cache timeout: Removing file ${fileId} (${cachedFile.name})`);
                    exports.fileCache.delete(fileId);
                }
            }, 30 * 60 * 1000);
            // Extract sample rows (first 3) for origin detection
            const sampleRows = data.slice(0, 3);
            const detectedSource = await gemini_service_1.GeminiService.detectSource(headers, sampleRows);
            res.status(201).json({
                success: true,
                payload: {
                    fileId,
                    fileName: cachedFile.name,
                    fileSize: cachedFile.size,
                    rows: cachedFile.rowsCount,
                    columns: cachedFile.colsCount,
                    uploadTime: cachedFile.uploadedAt,
                    detectedSource,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Establishes Server-Sent Events (SSE) connection and processes import batch-by-batch.
     */
    static async processImport(req, res, _next) {
        const { fileId } = req.params;
        if (!fileId) {
            res.status(400).json({ success: false, error: "Missing parameter: fileId" });
            return;
        }
        const mappingsQuery = req.query.mappings;
        let customMappings = undefined;
        if (mappingsQuery) {
            try {
                customMappings = JSON.parse(mappingsQuery);
            }
            catch (e) {
                console.error("❌ Failed to parse custom mappings query param:", e);
            }
        }
        const cachedFile = exports.fileCache.get(fileId);
        if (!cachedFile) {
            res.status(404).json({
                success: false,
                error: "File not found or upload expired. Please upload the CSV again.",
            });
            return;
        }
        // Set headers for Server-Sent Events (SSE)
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable buffering for Nginx
            'Access-Control-Allow-Origin': '*', // Enable CORS for client
        });
        console.log(`🚀 Starting SSE job for file ID: ${fileId} (${cachedFile.name})`);
        const sendSSE = (event, data) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };
        // Keep connection alive by sending a comment comment every 15 seconds
        const keepAliveInterval = setInterval(() => {
            res.write(': keep-alive\n\n');
        }, 15000);
        let isFinished = false;
        const cleanup = () => {
            if (isFinished)
                return;
            isFinished = true;
            clearInterval(keepAliveInterval);
            exports.fileCache.delete(fileId); // Remove file from cache
            console.log(`✅ Finished and cleaned up job for file ID: ${fileId}`);
        };
        req.on('close', () => {
            console.log(`🔌 Client closed connection for job: ${fileId}`);
            cleanup();
        });
        try {
            await batch_service_1.BatchService.processImport(cachedFile.content, customMappings, (progressEvent) => {
                // Stream the progress updates
                sendSSE('progress', progressEvent);
            });
            cleanup();
            res.end();
        }
        catch (error) {
            console.error(`❌ SSE Job Error:`, error);
            sendSSE('error', { error: error.message || 'An error occurred during import processing.' });
            cleanup();
            res.end();
        }
    }
}
exports.ImportController = ImportController;
