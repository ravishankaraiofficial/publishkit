import { introductionWord, strongLanguageDirective } from '../lib/languages';

export function getTimestampsPrompt(
  transcript: string,
  profile: any,
  outputLanguage: string = 'English'
): string {
  // Re-shape the strong directive for timestamps (no "respond in language" — these are chapter labels).
  const directive = strongLanguageDirective(outputLanguage).replace(
    'translate and respond EXCLUSIVELY',
    'write all chapter titles and timestamp labels'
  );
  const intro = introductionWord(outputLanguage);

  const cleanProfileStr = (v: any, max: number): string => {
    if (typeof v !== 'string') return '';
    return v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, max);
  };

  const niche = cleanProfileStr(profile?.niche, 200);
  const profileContext = niche
    ? `\nCreator Niche: ${niche}\nKeep the chapter titles relevant to this niche if applicable, but rely on the Source Content for the actual topics.`
    : '';

  return `
Read the following transcript, identify natural topic transitions, and output YouTube chapter timestamps.${profileContext}

STRUCTURE RULES:
1. If the content is long (likely resulting in 8 or more timestamps), group the timestamps into logical "Chapters" (e.g., 3-4 timestamps per chapter).
2. For each Chapter, provide a short, professional, and catchy heading on its own line, followed by the timestamps in that group.
3. If the content is short (less than 7 timestamps), provide a simple flat list of timestamps without chapter headings.

TIMESTAMP RULES:
1. The first timestamp MUST be exactly "0:00 ${intro}".
2. Use seconds based on cumulative word position (assume 150 words per minute).
3. Maximum 12 timestamps total.
4. Output plain text only. No markdown, no bolding, no code blocks.

${directive}

Source Content:
${transcript.substring(0, 50000)}
`;
}
