import { GoogleGenerativeAI } from '@google/generative-ai';
import { defineSecret } from 'firebase-functions/params';

// Define the secret to be loaded into Cloud Functions
export const geminiApiKey = defineSecret('GEMINI_API_KEY');

// Helper to get an initialized Gemini client
export const getGeminiClient = () => {
  return new GoogleGenerativeAI(geminiApiKey.value());
};
