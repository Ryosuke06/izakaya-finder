import { GoogleGenAI } from "@google/genai";

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error("Missing env: GEMINI_API_KEY");
}

export const ai = new GoogleGenAI({ apiKey: geminiApiKey });
