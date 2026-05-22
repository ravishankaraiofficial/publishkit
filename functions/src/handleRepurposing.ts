import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiApiKey } from './lib/gemini';
import { db } from './lib/firestore';
import { enforceRepurposingTrial, enforceBurstLimit } from './middleware/rateLimit';

// Strip null bytes and non-newline control characters. Keeps \n and \t.
// Prevents weird prompt-injection payloads that lean on \x00 or ANSI escapes.
function sanitizeUserText(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

const MAX_TITLE_CHARS = 500;
const MAX_DESCRIPTION_CHARS = 2000;
import { coerceLanguage, languageHint } from './lib/languages';
import { pickModel } from './lib/pickModel';
import { enforceFreeTierGuard } from './lib/freeTierGuard';

interface RepurposingOutput {
  x?: string[];
  instagram?: string[];
  linkedin?: string[];
  youtube?: string[];
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

      // Validate inputs. Sanitize control chars + apply hard length caps before
      // anything touches Gemini. These caps protect against (a) input-token cost
      // burn from oversized payloads, and (b) prompt-injection payloads padding
      // novel instructions far below the visible portion.
      const rawTitle = typeof data.title === 'string' ? sanitizeUserText(data.title.trim()) : '';
      const rawDescription = typeof data.description === 'string' ? sanitizeUserText(data.description.trim()) : '';
      const title = rawTitle;
      const description = rawDescription;
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
      if (title.length > MAX_TITLE_CHARS) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Title is too long (max ${MAX_TITLE_CHARS} characters)`
        );
      }
      if (description.length > MAX_DESCRIPTION_CHARS) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Description is too long (max ${MAX_DESCRIPTION_CHARS} characters)`
        );
      }

      if (platforms.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'At least one platform must be selected');
      }

      const validPlatforms = ['x', 'instagram', 'linkedin', 'youtube'];
      const selectedPlatforms = platforms.filter((p: any) => validPlatforms.includes(p));

      if (selectedPlatforms.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid platforms selected');
      }

      // Read plan once for both burst + monthly checks
      const userSnap = await db.doc(`users/${context.auth.uid}`).get();
      const plan = (userSnap.data()?.plan as string) || 'free';

      // Burst rate limit: blocks single-user request floods. Tier limits:
      // Free 2/min, Pro 8/min, Max 20/min. Sliding 60s window.
      await enforceBurstLimit(context.auth.uid, plan);

      // Anti-abuse: free-tier device/IP guard. No-op for paid users.
      const rawIp =
        (context.rawRequest?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        (context.rawRequest as any)?.ip ||
        '';
      const visitorId = typeof data.visitorId === 'string' ? data.visitorId : undefined;
      await enforceFreeTierGuard({ uid: context.auth.uid, rawIp, visitorId, plan });

      // Monthly usage — charges once per selected platform (3 platforms = 3).
      await enforceRepurposingTrial(context.auth.uid, plan, selectedPlatforms.length);

      // Initialize Gemini
      const apiKey = geminiApiKey.value();
      const genAI = new GoogleGenerativeAI(apiKey);
      // MultiPost stays on Flash for all plans (pickModel enforces this).
      const model = genAI.getGenerativeModel({ model: pickModel(plan, 'multipost') });

      const output: RepurposingOutput = {};

      // Generate content for each platform in parallel
      const promises = selectedPlatforms.map(async (platform: string) => {
        let prompt = '';

        const languageLine = `- Language: ${language}${languageHint(language)}`;

        if (platform === 'x') {
          prompt = `Create exactly 1 distinct, engaging tweet based on this content:
Title: ${title}
Description: ${description}

Requirements:
- The tweet should be a complete thought
- Include a strong hook
- Include emojis
- Under 280 chars per tweet
${languageLine}

Return ONLY a JSON array of 1 string, no markdown:
["tweet text"]`;
        } else if (platform === 'instagram') {
          prompt = `Create exactly 1 distinct, highly engaging Instagram caption based on this content:
Title: ${title}
Description: ${description}

Requirements:
- Engaging, personality-driven
- Include relevant emojis
- Add 20 relevant hashtags at the end
- 1-3 paragraphs per caption
${languageLine}

Return ONLY a JSON array of 1 string, no markdown:
["caption text"]`;
        } else if (platform === 'linkedin') {
          prompt = `Create exactly 1 distinct, highly formal and professional LinkedIn post based on this content:
Title: ${title}
Description: ${description}

Requirements:
- Professional, authoritative, and formal tone
- 3-5 paragraphs per post
- Start with a professional hook
- Include insights and takeaways
- End with a call-to-action
${languageLine}

Return ONLY a JSON array of 1 string, no markdown:
["post text"]`;
        } else if (platform === 'youtube') {
          prompt = `Create exactly 1 distinct YouTube community post based on this content:
Title: ${title}
Description: ${description}

Requirements:
- Engaging, hook-driven opening
- Conversational and community-focused tone
- Ask a question to drive comments
- Include relevant emojis
- 2-4 short paragraphs per post
${languageLine}

Return ONLY a JSON array of 1 string, no markdown:
["post text"]`;
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
            const arrayMatch = responseText.match(/\[[\s\S]*\]/);
            if (arrayMatch) jsonText = arrayMatch[0];
          }

          const parsed = JSON.parse(jsonText);
          const parsedArray = Array.isArray(parsed) ? parsed : [typeof parsed === 'string' ? parsed : JSON.stringify(parsed)];

          if (platform === 'x') {
            output.x = parsedArray;
          } else if (platform === 'instagram') {
            output.instagram = parsedArray;
          } else if (platform === 'linkedin') {
            output.linkedin = parsedArray;
          } else if (platform === 'youtube') {
            output.youtube = parsedArray;
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
