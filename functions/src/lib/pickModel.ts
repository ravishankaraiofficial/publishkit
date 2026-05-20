// Pick which Gemini model to use for a given user + feature.
//
// Policy:
//   - Default everyone to gemini-2.5-flash (cheap, fast, "very good" quality).
//   - Max-plan users get gemini-2.5-pro for Script Writer only. Metadata and
//     MultiPost stay on Flash even for Max users — the quality gap on those
//     short structured outputs is negligible and routing them to Pro would
//     blow the per-user margin.
//
// Centralizing this so the routing rule lives in exactly one place. If we
// later want a "Premium script (uses N credits)" button or roll Pro out to
// Pro-plan users, only this file changes.

export type Plan = 'free' | 'pro' | 'max';
export type Feature = 'script' | 'metadata' | 'multipost';

const FLASH = 'gemini-2.5-flash';
const PRO = 'gemini-2.5-pro';

export function pickModel(plan: Plan | string | undefined, feature: Feature): string {
  const normalizedPlan = (plan === 'max' || plan === 'pro' || plan === 'free' ? plan : 'free') as Plan;
  if (normalizedPlan === 'max' && feature === 'script') return PRO;
  return FLASH;
}
