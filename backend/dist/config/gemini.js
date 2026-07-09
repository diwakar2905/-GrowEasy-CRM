"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEMINI_MODEL_NAME = exports.genAI = void 0;
const generative_ai_1 = require("@google/generative-ai");
const env_1 = require("./env");
if (!env_1.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in the environment.");
}
exports.genAI = new generative_ai_1.GoogleGenerativeAI(env_1.env.GEMINI_API_KEY);
// We will use gemini-1.5-flash for fast and cost-effective batch inference
exports.GEMINI_MODEL_NAME = 'gemini-1.5-flash';
