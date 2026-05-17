import { strongLanguageDirective } from '../lib/languages';

export function getTitlesPrompt(
  transcript: string,
  profile: any,
  outputLanguage: string = 'English'
): string {
  const directive = strongLanguageDirective(outputLanguage);
  const effectiveLanguage = outputLanguage || profile.language || 'English';

  return `
You are an expert YouTube strategist. Given the following video transcript, generate exactly 5 YouTube title options ranked best to worst for CTR.
For each title, provide a one-line reason explaining why it works.
Optimize for: hook strength, curiosity gap, keyword inclusion, and length under 60 characters.
The title language MUST be: ${effectiveLanguage}.${directive}

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
