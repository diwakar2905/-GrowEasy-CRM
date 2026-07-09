"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = errorMiddleware;
const multer_1 = __importDefault(require("multer"));
function errorMiddleware(err, _req, res, _next) {
    console.error("❌ Global Error Handler caught an error:", err);
    // Handle Multer upload errors
    if (err instanceof multer_1.default.MulterError) {
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
