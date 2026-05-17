import { strongLanguageDirective } from '../lib/languages';

export function getDescriptionPrompt(
  transcript: string,
  profile: any,
  outputLanguage: string = 'English'
): string {
  const directive = strongLanguageDirective(outputLanguage);
  const effectiveLanguage = outputLanguage || profile.language || 'English';

  return `
You are an expert YouTube strategist. Given the following video transcript, write a highly engaging YouTube video description.
The description MUST be in this language: ${effectiveLanguage}.${directive}

It must include:
1. A strong 2-sentence hook at the top.
2. A brief 3-4 sentence summary of the video.
3. The exact string [TIMESTAMPS_PLACEHOLDER] (I will replace this later).
4. Relevant hashtags (e.g., #YouTube #Creator).

Source Content (Transcript or Document Analysis):
${transcript.substring(0, 50000)}
`;
}
