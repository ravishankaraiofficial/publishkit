import type { CreatorProfile } from '../types';

export function getRemainingMultiPostQuota(profile: CreatorProfile | null | undefined): number {
  if (!profile) return 3; // Fallback for loading states
  const plan = profile.plan || 'free';
  const limit = plan === 'ultra' ? 350 : plan === 'pro' ? 100 : 3;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const usage = profile.repurposingUsageMonth === currentMonth ? (profile.repurposingUsageThisMonth || 0) : 0;
  return Math.max(0, limit - usage);
}
