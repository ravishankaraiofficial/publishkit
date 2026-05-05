type OutputLanguage = "English" | "Hindi";

export function getTimestampsPrompt(
  transcript: string,
  outputLanguage: OutputLanguage = "English"
): string {
  const hindiInstruction =
    outputLanguage === "Hindi"
      ? `\nIMPORTANT: Chapter labels must be in Hindi using Devanagari script. Keep the timestamp values themselves in numeric format only (e.g., "0:00", "2:35").\n`
      : "";

  return `
Read the following transcript, identify natural topic transitions, and output YouTube chapter timestamps.${hindiInstruction}
Rules:
1. The first line MUST be exactly "0:00 ${outputLanguage === "Hindi" ? "परिचय" : "Introduction"}".
2. Use seconds based on cumulative word position in transcript (assume 150 words per minute average speaking rate).
3. Maximum 10 chapters.
4. Output plain text only, ready to paste into a YouTube description. Do NOT use markdown code blocks like \`\`\`.

Source Content (Transcript or Document Analysis):
${transcript.substring(0, 50000)}
`;
}
