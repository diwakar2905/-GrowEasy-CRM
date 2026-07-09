import { Router } from 'express';
import { ImportController } from '../controllers/import.controller';
import { uploadMiddleware } from '../middlewares/upload.middleware';

const router = Router();

// Endpoint to upload a CSV file
// Field name in multipart/form-data must be 'file'
router.post('/upload', uploadMiddleware.single('file'), ImportController.uploadFile);

// Endpoint to process import using SSE
router.get('/process/:fileId', ImportController.processImport);

export default router;
