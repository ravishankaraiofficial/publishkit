import { strongLanguageDirective } from '../lib/languages';

export function getTitlesPrompt(
  transcript: string,
  profile: any,
  outputLanguage: string = 'English'
): string {
  const directive = strongLanguageDirective(outputLanguage);
  const effectiveLanguage = outputLanguage || profile?.language || 'English';

  const cleanProfileStr = (v: any, max: number): string => {
    if (typeof v !== 'string') return '';
    return v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, max);
  };

  const niche = cleanProfileStr(profile?.niche, 200);
  const targetAudience = cleanProfileStr(profile?.targetAudience, 300);
  const tone = cleanProfileStr(profile?.tone, 200);

  const profileLines: string[] = [];
  if (niche) profileLines.push(`Niche: ${niche}`);
  if (targetAudience) profileLines.push(`Target Audience: ${targetAudience}`);
  if (tone) profileLines.push(`Tone: ${tone}`);

  const profileContext = profileLines.length > 0
    ? `\n--- CREATOR PROFILE ---\n${profileLines.join('\n')}\nUse the profile to tailor the titles to the audience and tone, but DO NOT let it override the actual facts of the Source Content. The transcript is the source of truth for the topic.`
    : '';

  return `
You are an expert YouTube strategist. Given the following video transcript, generate exactly 5 YouTube title options ranked best to worst for CTR.
For each title, provide a one-line reason explaining why it works.
Optimize for: hook strength, curiosity gap, keyword inclusion, and length under 60 characters.${profileContext}
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
