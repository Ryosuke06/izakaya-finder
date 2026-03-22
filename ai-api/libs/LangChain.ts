import { GoogleGenAI } from "@google/genai";

const Gemini_API_KEY = process.env.izakaya_found_gimini_api;

export const ai = new GoogleGenAI({ apiKey: Gemini_API_KEY });
