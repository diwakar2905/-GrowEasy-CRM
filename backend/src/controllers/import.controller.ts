import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { CSVService } from '../services/csv.service';
import { BatchService } from '../services/batch.service';
import { GeminiService } from '../services/gemini.service';

// In-memory cache to temporarily store CSV file text between upload and process steps
// Keys are UUIDs, values are CSV content and metadata.
interface CachedFile {
  name: string;
  content: string;
  size: number;
  rowsCount: number;
  colsCount: number;
  uploadedAt: string;
}

export const fileCache = new Map<string, CachedFile>();

export class ImportController {
  /**
   * Handles file upload, parses CSV briefly to count rows/cols, caches file, and returns metadata.
   */
  public static async uploadFile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: "No CSV file was uploaded." });
        return;
      }

      const fileBuffer = req.file.buffer;
      const csvString = fileBuffer.toString('utf-8');

      // Parse with PapaParse to verify CSV structure and get metadata
      const { data, headers } = await CSVService.parse(csvString);

      const fileId = crypto.randomUUID();
      const cachedFile: CachedFile = {
        name: req.file.originalname,
        content: csvString,
        size: req.file.size,
        rowsCount: data.length,
        colsCount: headers.length,
        uploadedAt: new Date().toISOString(),
      };

      // Store in memory cache
      fileCache.set(fileId, cachedFile);

      // Automatically clean up file from cache after 30 minutes to prevent memory leaks
      setTimeout(() => {
        if (fileCache.has(fileId)) {
          console.log(`🧹 Cache timeout: Removing file ${fileId} (${cachedFile.name})`);
          fileCache.delete(fileId);
        }
      }, 30 * 60 * 1000);

      // Extract sample rows (first 3) for origin detection
      const sampleRows = data.slice(0, 3);
      const detectedSource = await GeminiService.detectSource(headers, sampleRows);

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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Establishes Server-Sent Events (SSE) connection and processes import batch-by-batch.
   */
  public static async processImport(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const { fileId } = req.params;

    if (!fileId) {
      res.status(400).json({ success: false, error: "Missing parameter: fileId" });
      return;
    }

    const mappingsQuery = req.query.mappings as string;
    let customMappings: Record<string, string> | undefined = undefined;
    if (mappingsQuery) {
      try {
        customMappings = JSON.parse(mappingsQuery);
      } catch (e) {
        console.error("❌ Failed to parse custom mappings query param:", e);
      }
    }

    const cachedFile = fileCache.get(fileId);
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

    const sendSSE = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Keep connection alive by sending a comment comment every 15 seconds
    const keepAliveInterval = setInterval(() => {
      res.write(': keep-alive\n\n');
    }, 15000);

    let isFinished = false;

    const cleanup = () => {
      if (isFinished) return;
      isFinished = true;
      clearInterval(keepAliveInterval);
      fileCache.delete(fileId); // Remove file from cache
      console.log(`✅ Finished and cleaned up job for file ID: ${fileId}`);
    };

    req.on('close', () => {
      console.log(`🔌 Client closed connection for job: ${fileId}`);
      cleanup();
    });

    try {
      await BatchService.processImport(cachedFile.content, customMappings, (progressEvent) => {
        // Stream the progress updates
        sendSSE('progress', progressEvent);
      });
      
      cleanup();
      res.end();
    } catch (error: any) {
      console.error(`❌ SSE Job Error:`, error);
      sendSSE('error', { error: error.message || 'An error occurred during import processing.' });
      cleanup();
      res.end();
    }
  }
}
