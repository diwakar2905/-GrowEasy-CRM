"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const server = app_1.default.listen(env_1.env.PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 CRM CSV Importer Server started!`);
    console.log(`📶 Environment: ${env_1.env.NODE_ENV}`);
    console.log(`🔌 Listening on port: ${env_1.env.PORT}`);
    console.log(`=========================================`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('💤 Server closed.');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('👋 SIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('💤 Server closed.');
        process.exit(0);
    });
});
