import { getGeminiClient } from './lib/gemini';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { geminiApiKey } from './lib/gemini';
import * as path from 'path';

export async function transcribeAudio(localFilePath: string, mimeType: string): Promise<string> {
  const fileManager = new GoogleAIFileManager(geminiApiKey.value());
  
  // Upload the file to Gemini
  const uploadResult = await fileManager.uploadFile(localFilePath, {
    mimeType: mimeType,
    displayName: path.basename(localFilePath),
  });

  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const promptText = mimeType.startsWith('audio/')
      ? "Please transcribe the following audio accurately. Output only the transcript."
      : "You are a professional content analyser. Thoroughly read this document or image and extract all text and visual information. Provide a detailed, comprehensive summary of everything you see or read. Your output will be used as the source for generating YouTube metadata, so ensure you capture every key detail as if it were a spoken script.";

    // Generate transcription/analysis
    const result = await model.generateContent([
      {
        fileData: {
          fileUri: uploadResult.file.uri,
          mimeType: uploadResult.file.mimeType,
        },
      },
      { text: promptText },
    ]);

    return result.response.text();
  } finally {
    // Clean up the file from Gemini File API regardless of success or failure.
    // This is critical for privacy and avoiding storage leaks in the File API.
    await fileManager.deleteFile(uploadResult.file.name).catch(err => {
      console.warn('[transcribe:deleteFile] Failed to delete file from Gemini API:', err?.message);
    });
  }
}
