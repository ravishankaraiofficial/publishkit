type OutputLanguage = "English" | "Hindi";

export function getTimestampsPrompt(
  transcript: string,
  outputLanguage: OutputLanguage = "English"
): string {
  const hindiInstruction =
    outputLanguage === "Hindi"
      ? `\nIMPORTANT: All chapter titles and timestamp labels must be in Hindi using Devanagari script. Keep the timestamp values themselves in numeric format (e.g., "0:00", "2:35").\n`
      : "";

  return `
Read the following transcript, identify natural topic transitions, and output YouTube chapter timestamps.

STRUCTURE RULES:
1. If the content is long (likely resulting in 8 or more timestamps), group the timestamps into logical "Chapters" (e.g., 3-4 timestamps per chapter).
2. For each Chapter, provide a short, professional, and catchy heading on its own line, followed by the timestamps in that group.
3. If the content is short (less than 7 timestamps), provide a simple flat list of timestamps without chapter headings.

TIMESTAMP RULES:
1. The first timestamp MUST be exactly "0:00 ${outputLanguage === "Hindi" ? "परिचय" : "Introduction"}".
2. Use seconds based on cumulative word position (assume 150 words per minute).
3. Maximum 12 timestamps total.
4. Output plain text only. No markdown, no bolding, no code blocks.

${hindiInstruction}

Source Content:
${transcript.substring(0, 50000)}
`;
}
