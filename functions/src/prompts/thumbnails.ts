type OutputLanguage = "English" | "Hindi";

export function getThumbnailsPrompt(
  transcript: string,
  profile: any,
  outputLanguage: OutputLanguage = "English"
): string {
  const hindiInstruction =
    outputLanguage === "Hindi"
      ? `\nCRITICAL INSTRUCTION: Any text that appears IN the thumbnail image MUST be written in Hindi (Devanagari script). The description of the image itself should be in English so the AI image generator understands it.\n`
      : "";

  const effectiveLanguage = outputLanguage || profile.language;

  return `
You are an expert YouTube thumbnail designer. Based on the transcript, suggest one highly clickable thumbnail concept.
The target audience language is: ${effectiveLanguage}.${hindiInstruction}

Output strict JSON with this schema:
{
  "imagen": "Prompt optimized for Google Imagen 3. Focus on photorealism and exact text placement.",
  "chatgpt": "Prompt optimized for DALL-E 3. Focus on illustration style and bold typography."
}

Source Content (Transcript or Document Analysis):
${transcript.substring(0, 50000)}
`;
}
