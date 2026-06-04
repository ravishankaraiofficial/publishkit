import * as functions from 'firebase-functions/v1';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiApiKey } from './lib/gemini';
import { db } from './lib/firestore';
import { enforceScriptTrial, enforceBurstLimit } from './middleware/rateLimit';
import { coerceLanguage } from './lib/languages';
import { pickModel } from './lib/pickModel';
import { enforceFreeTierGuard } from './lib/freeTierGuard';
import { buildScriptPrompt } from './lib/scriptPrompt';

interface ScriptOutput {
  script: string;
  analysis: string;
}

export const generateScript = functions
  .runWith({ timeoutSeconds: 60, memory: '256MB', secrets: [geminiApiKey] })
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
      const topic = typeof data.topic === 'string' ? data.topic.trim() : '';
      const tone = ['Casual', 'Educational', 'Storytelling'].includes(data.tone) ? data.tone : 'Casual';
      const duration = ['5', '10', '15'].includes(data.duration) ? data.duration : '10';
      const language = coerceLanguage(data.language);

      if (!topic || topic.length === 0 || topic.length > 500) {
        throw new functions.https.HttpsError('invalid-argument', 'Topic must be between 1 and 500 characters');
      }

      // Read plan + profile once for burst + monthly checks + prompt personalization
      const userSnap = await db.doc(`users/${context.auth.uid}`).get();
      const profile = userSnap.data() || {};
      const plan = (profile.plan as string) || 'free';

      // Burst rate limit: prevents a single user from firing dozens of calls
      // per second to DoS Gemini quota / other users. Throws resource-exhausted
      // with a "Slow down" message. Tier limits: Free 2/min, Pro 8/min, Max 20/min.
      await enforceBurstLimit(context.auth.uid, plan);

      // Anti-abuse: free-tier device/IP guard. Blocks a fresh UID from reusing
      // the free tier on a device that already burned through one free account.
      // No-op for paid users.
      const rawIp =
        (context.rawRequest?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        (context.rawRequest as any)?.ip ||
        '';
      const visitorId = typeof data.visitorId === 'string' ? data.visitorId : undefined;
      await enforceFreeTierGuard({ uid: context.auth.uid, rawIp, visitorId, plan });

      // Monthly usage enforcement (atomic; throws resource-exhausted when blocked)
      await enforceScriptTrial(context.auth.uid, plan);

      // Initialize Gemini
      const apiKey = geminiApiKey.value();
      const genAI = new GoogleGenerativeAI(apiKey);
      // Max-plan users get Gemini 2.5 Pro for script generation; everyone else
      // stays on Flash. See functions/src/lib/pickModel.ts for the policy.
      const model = genAI.getGenerativeModel({ model: pickModel(plan, 'script') });

      // Sanitize: strip null bytes + control chars (keep newlines/tabs). Caps
      // prevent prompt-injection cost burn — user-controlled text is bounded.
      const prompt = buildScriptPrompt(`Topic: ${topic}`, profile, tone, duration, language);

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Parse JSON from response (handle markdown code blocks)
      let jsonText = responseText;
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        // Try to extract JSON object directly
        const objectMatch = responseText.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          jsonText = objectMatch[0];
        }
      }

      const scriptData: ScriptOutput = JSON.parse(jsonText);

      // Validate output structure
      if (!scriptData.script || !scriptData.analysis) {
        throw new Error('Invalid script structure from Gemini');
      }

      return scriptData;
    } catch (error: any) {
      console.error('generateScript error:', error?.message);

      // Return specific error messages
      if (error instanceof SyntaxError) {
        throw new functions.https.HttpsError('internal', 'Failed to parse script response. Please try again.');
      }

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', 'Failed to generate script. Please try again.');
    }
  });
