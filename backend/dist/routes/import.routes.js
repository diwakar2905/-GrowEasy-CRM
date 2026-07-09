"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const import_controller_1 = require("../controllers/import.controller");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = (0, express_1.Router)();
// Endpoint to upload a CSV file
// Field name in multipart/form-data must be 'file'
router.post('/upload', upload_middleware_1.uploadMiddleware.single('file'), import_controller_1.ImportController.uploadFile);
// Endpoint to process import using SSE
router.get('/process/:fileId', import_controller_1.ImportController.processImport);
exports.default = router;
