type OutputLanguage = "English" | "Hindi";

export function getDescriptionPrompt(
  transcript: string,
  profile: any,
  outputLanguage: OutputLanguage = "English"
): string {
  const hindiInstruction =
    outputLanguage === "Hindi"
      ? `\nCRITICAL INSTRUCTION: You MUST translate and respond EXCLUSIVELY in Hindi using the Devanagari script. Do NOT respond in English. Keep timestamps in numeric format only.\n`
      : "";

  const effectiveLanguage = outputLanguage || profile.language;

  return `
You are an expert YouTube strategist. Given the following video transcript, write a highly engaging YouTube video description.
The description MUST be in this language: ${effectiveLanguage}.${hindiInstruction}

It must include:
1. A strong 2-sentence hook at the top.
2. A brief 3-4 sentence summary of the video.
3. The exact string [TIMESTAMPS_PLACEHOLDER] (I will replace this later).
4. Relevant hashtags (e.g., #YouTube #Creator).

Source Content (Transcript or Document Analysis):
${transcript.substring(0, 50000)}
`;
}
