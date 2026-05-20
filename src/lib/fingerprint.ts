// Thin wrapper around FingerprintJS (already a dep). Returns a stable
// visitor ID for the current browser. Used by the free-tier abuse guard so
// a user can't reset their free quota by clearing browser history.
//
// Falls back to 'anonymous-fp' if FingerprintJS is blocked (privacy
// extensions, Brave shields, etc.). In that case the IP-hash side of the
// guard still applies; only the device-side weakens.
import fpPromise from '@fingerprintjs/fingerprintjs';

let cached: string | null = null;

export async function getVisitorId(): Promise<string> {
  if (cached) return cached;
  try {
    const fp = await fpPromise.load();
    const result = await fp.get();
    cached = result.visitorId || 'anonymous-fp';
  } catch {
    cached = 'anonymous-fp';
  }
  return cached;
}
