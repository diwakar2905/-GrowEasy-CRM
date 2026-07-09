"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// Store files in memory buffer
const storage = multer_1.default.memoryStorage();
// File filter to restrict uploads to CSV only
const fileFilter = (_req, file, callback) => {
    const fileExt = path_1.default.extname(file.originalname).toLowerCase();
    if (fileExt !== '.csv' && file.mimetype !== 'text/csv') {
        return callback(new Error('Only CSV files (.csv) are allowed.'));
    }
    callback(null, true);
};
// Size limit of 10MB
exports.uploadMiddleware = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB in bytes
    },
});
