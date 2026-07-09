"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(5000),
    GEMINI_API_KEY: zod_1.z.string({
        required_error: "GEMINI_API_KEY is required in the environment variables",
    }),
    CORS_ORIGIN: zod_1.z.string().default("http://localhost:3000"),
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("development"),
});
const parseEnv = () => {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error("❌ Environment validation error:");
        console.error(JSON.stringify(result.error.format(), null, 2));
        process.exit(1);
    }
    return result.data;
};
exports.env = parseEnv();
