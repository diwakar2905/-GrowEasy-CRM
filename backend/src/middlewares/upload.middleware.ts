import multer from 'multer';
import path from 'path';

// Store files in memory buffer
const storage = multer.memoryStorage();

// File filter to restrict uploads to CSV only
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  if (fileExt !== '.csv' && file.mimetype !== 'text/csv') {
    return callback(new Error('Only CSV files (.csv) are allowed.'));
  }
  
  callback(null, true);
};

// Size limit of 10MB
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB in bytes
  },
});
