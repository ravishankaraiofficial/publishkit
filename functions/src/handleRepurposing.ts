import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiApiKey } from './lib/gemini';
import { db } from './lib/firestore';
import { enforceRepurposingTrial } from './middleware/rateLimit';
import { coerceLanguage, languageHint } from './lib/languages';

interface RepurposingOutput {
  x?: string[];
  instagram?: string;
  linkedin?: string;
}

export const generateRepurposing = functions
  .runWith({ timeoutSeconds: 90, memory: '256MB', secrets: [geminiApiKey] })
  .https.onCall(async (data, context) => {
    try {
      // Security: App Check enforcement
      if (!context.app) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'The function must be called from an App Check verified app.'
        );
      }

      // Authentication check
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
      }

      // Validate inputs
      const title = typeof data.title === 'string' ? data.title.trim() : '';
      const description = typeof data.description === 'string' ? data.description.trim() : '';
      const platforms = Array.isArray(data.platforms) ? data.platforms : [];
      const language = coerceLanguage(data.language);
      // Optional: when provided, the resulting MultiPost output is persisted
      // onto users/{uid}/results/{resultId}.multiPostOutput so it shows in
      // History and auto-deletes with the rest of the result doc.
      const resultId =
        typeof data.resultId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(data.resultId)
          ? data.resultId
          : null;

      if (!title || title.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Title is required');
      }

      if (platforms.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'At least one platform must be selected');
      }

      const validPlatforms = ['x', 'instagram', 'linkedin'];
      const selectedPlatforms = platforms.filter((p: any) => validPlatforms.includes(p));

      if (selectedPlatforms.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid platforms selected');
      }

      // Plan-aware trial / usage enforcement (atomic; throws resource-exhausted when blocked)
      // Charges once per selected platform — 3 platforms = 3 generations.
      const userSnap = await db.doc(`users/${context.auth.uid}`).get();
      const plan = (userSnap.data()?.plan as string) || 'free';
      await enforceRepurposingTrial(context.auth.uid, plan, selectedPlatforms.length);

      // Initialize Gemini
      const apiKey = geminiApiKey.value();
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const output: RepurposingOutput = {};

      // Generate content for each platform in parallel
      const promises = selectedPlatforms.map(async (platform: string) => {
        let prompt = '';

        const languageLine = `- Language: ${language}${languageHint(language)}`;

        if (platform === 'x') {
          prompt = `Create a Twitter/X thread (5-7 tweets) based on this content:
Title: ${title}
Description: ${description}

Requirements:
- Each tweet max 280 characters
- Engaging, shareable content
- Natural thread flow
- Professional tone
${languageLine}

Return ONLY a JSON array of tweet strings, no markdown:
["tweet 1", "tweet 2", ...]`;
        } else if (platform === 'instagram') {
          prompt = `Create an Instagram caption based on this content:
Title: ${title}
Description: ${description}

Requirements:
- Engaging, personality-driven
- Include relevant emojis
- Add 20 relevant hashtags at the end
- 1-3 paragraphs
${languageLine}

Return ONLY a JSON string, no markdown:
"caption text here"`;
        } else if (platform === 'linkedin') {
          prompt = `Create a professional LinkedIn post based on this content:
Title: ${title}
Description: ${description}

Requirements:
- Professional but approachable tone
- 3-5 paragraphs
- Start with a hook
- Include insights and takeaways
- End with a call-to-action
${languageLine}

Return ONLY a JSON string, no markdown:
"post text here"`;
        }

        try {
          const result = await model.generateContent(prompt);
          const responseText = result.response.text();

          // Parse JSON from response
          let jsonText = responseText;
          const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonText = jsonMatch[1];
          } else {
            // Try to extract JSON directly
            if (platform === 'x') {
              const arrayMatch = responseText.match(/\[[\s\S]*\]/);
              if (arrayMatch) jsonText = arrayMatch[0];
            } else {
              const stringMatch = responseText.match(/"[\s\S]*"/);
              if (stringMatch) jsonText = stringMatch[0];
            }
          }

          const parsed = JSON.parse(jsonText);

          if (platform === 'x') {
            output.x = Array.isArray(parsed) ? parsed : [parsed];
          } else if (platform === 'instagram') {
            output.instagram = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
          } else if (platform === 'linkedin') {
            output.linkedin = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
          }
        } catch (platformError) {
          console.error(`Error generating ${platform} content:`, platformError);
          // Continue with other platforms even if one fails
        }
      });

      await Promise.all(promises);

      // Ensure at least one platform succeeded
      if (Object.keys(output).length === 0) {
        throw new functions.https.HttpsError('internal', 'Failed to generate content for any platform');
      }

      // If a resultId was supplied, persist the output onto that result doc.
      // Path is constructed from the caller's auth uid (NOT a client-supplied uid),
      // so the write is implicitly scoped to the caller's own results subtree.
      if (resultId) {
        try {
          await db.doc(`users/${context.auth.uid}/results/${resultId}`).update({
            multiPostOutput: output,
          });
        } catch (persistErr: any) {
          // Persist failure is non-fatal — the caller still receives the output
          // in the return payload and can fall back to in-memory display.
          console.error('Failed to persist multiPostOutput to result doc:', persistErr?.message);
        }
      }

      return output;
    } catch (error: any) {
      console.error('generateRepurposing error:', error?.message);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', 'Failed to generate repurposed content. Please try again.');
    }
  });
