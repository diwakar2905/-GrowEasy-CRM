import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export function errorMiddleware(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("❌ Global Error Handler caught an error:", err);

  // Handle Multer upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: "File is too large. Maximum size allowed is 10MB.",
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`,
    });
    return;
  }

  // Handle other explicitly thrown errors
  const statusCode = err.status || 500;
  const message = err.message || "An unexpected internal server error occurred.";

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}
