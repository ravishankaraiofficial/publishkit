type OutputLanguage = "English" | "Hindi";

export function getTitlesPrompt(
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
You are an expert YouTube strategist. Given the following video transcript, generate exactly 5 YouTube title options ranked best to worst for CTR.
For each title, provide a one-line reason explaining why it works.
Optimize for: hook strength, curiosity gap, keyword inclusion, and length under 60 characters.
The title language MUST be: ${effectiveLanguage}.${hindiInstruction}

Output strict JSON with this schema:
{
  "titles": [
    {
      "title": "string",
      "reason": "string"
    }
  ]
}

Source Content (Transcript or Document Analysis):
${transcript.substring(0, 50000)}
`;
}
