import type { CreatorProfile } from '../types';

export function getRemainingMultiPostQuota(profile: CreatorProfile | null | undefined): number {
  if (!profile) return 3; // Fallback for loading states
  const plan = profile.plan || 'free';
  const limit = plan === 'ultra' ? 350 : plan === 'pro' ? 100 : 3;
  
  let usage = profile.repurposingUsage || 0;
  const cycleStartStr = profile.usageCycleStart;
  if (cycleStartStr) {
    const cycleStartDate = new Date(cycleStartStr);
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - cycleStartDate.getTime() > THIRTY_DAYS_MS) {
      usage = 0; // Visually reset if cycle is expired
    }
  }

  return Math.max(0, limit - usage);
}
