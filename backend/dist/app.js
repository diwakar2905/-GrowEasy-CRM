"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const import_routes_1 = __importDefault(require("./routes/import.routes"));
const error_middleware_1 = require("./middlewares/error.middleware");
const env_1 = require("./config/env");
const app = (0, express_1.default)();
// Enable CORS with support for multiple origins and Vercel dynamic urls
const allowedOrigins = env_1.env.CORS_ORIGIN ? env_1.env.CORS_ORIGIN.split(',').map(o => o.trim()) : [];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin)
            return callback(null, true);
        // Check if origin matches allowed list or matches vercel deployment
        const isAllowed = allowedOrigins.includes(origin) ||
            allowedOrigins.includes('*') ||
            origin.endsWith('.vercel.app');
        if (isAllowed) {
            callback(null, true);
        }
        else {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
// Body parser
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Register import routes
app.use('/api/import', import_routes_1.default);
// Global error handler (should be registered after all routes)
app.use(error_middleware_1.errorMiddleware);
exports.default = app;
