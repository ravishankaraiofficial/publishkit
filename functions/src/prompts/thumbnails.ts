import { thumbnailLanguageDirective } from '../lib/languages';

export function getThumbnailsPrompt(
  transcript: string,
  profile: any,
  outputLanguage: string = 'English'
): string {
  const directive = thumbnailLanguageDirective(outputLanguage);
  const effectiveLanguage = outputLanguage || profile.language || 'English';

  return `
You are an expert YouTube thumbnail designer and high-end AI prompt engineer.
Based on the transcript provided, design ONE highly clickable, viral thumbnail concept.

Your task is to generate TWO separate, extremely detailed "big and deep" prompts for this concept:

1. **Imagen 3 Prompt**: Optimized for Google's Imagen 3.
   - Focus on cinematic photorealism, precise lighting (e.g., Volumetric lighting, 8k, Unreal Engine 5 style).
   - Describe exact camera angles, textures, and specific placement of elements.
   - If text is included, specify the font style and placement precisely.
   - Personalize using the creator's appearance: "${profile.appearance}" and brand colors: ${profile.brandColor1}, ${profile.brandColor2}.

2. **DALL-E 3 / ChatGPT Prompt**: Optimized for OpenAI's DALL-E 3.
   - Focus on vibrant, bold, and high-contrast composition.
   - Describe the scene with rich descriptive adjectives.
   - Focus on emotional impact and "YouTube-style" bold typography.
   - Personalize using the creator's appearance: "${profile.appearance}" and brand colors: ${profile.brandColor1}, ${profile.brandColor2}.

The target audience language is: ${effectiveLanguage}.${directive}

OUTPUT REQUIREMENTS:
- Output STRICT JSON.
- The "imagen" field should contain the deep prompt for Imagen 3.
- The "chatgpt" field should contain the deep prompt for DALL-E 3.
- Do NOT include any preamble or extra text outside the JSON.

Source Content (Transcript):
${transcript.substring(0, 45000)}
`;
}
