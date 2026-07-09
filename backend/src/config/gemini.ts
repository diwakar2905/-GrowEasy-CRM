import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './env';

if (!env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in the environment.");
}

export const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// We will use gemini-1.5-flash for fast and cost-effective batch inference
export const GEMINI_MODEL_NAME = 'gemini-1.5-flash';
