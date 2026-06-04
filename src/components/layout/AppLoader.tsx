import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

const TIPS = [
  'Drop your audio, PDF, or image — we handle the rest.',
  'Generates titles, timestamps & description in 90 seconds.',
  'Smart summaries for documents and images too.',
  'Your uploads auto-delete 3 hours after processing.',
  'Copy & paste straight into YouTube — done!',
];

/**
 * Branded full-screen loader shown while auth is resolving
 * (especially after a Google redirect). Rotates short tips so
 * the user has something to read instead of staring at a spinner.
 *
 * The interval starts slow and speeds up if loading takes longer,
 * so a fast load barely flashes a tip while a slow load keeps the
 * user engaged.
 */
export function AppLoader() {
  const [tipIndex, setTipIndex] = useState(0);
  const [interval, setIntervalMs] = useState(2400);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [interval]);

  // Accelerate tip rotation if the loader has been visible for >3s
  useEffect(() => {
    const t = window.setTimeout(() => setIntervalMs(1600), 3000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0D0D0D] text-gray-900 dark:text-[#F5F5F5] flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-3 mb-10">
        <Zap className="w-7 h-7 text-[#E05A1E]" />
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#E05A1E]">
          PublishKit
        </h1>
      </div>

      <div
        className="eq-bars mb-10"
        style={{ filter: 'drop-shadow(0 0 24px rgba(224,90,30,0.25))' }}
        aria-hidden="true"
      >
        <span /><span /><span /><span /><span />
      </div>

      <p
        key={tipIndex}
        className="status-text max-w-md text-center text-sm sm:text-base text-gray-600 dark:text-[#CFCFCF] leading-relaxed"
      >
        {TIPS[tipIndex]}
      </p>

      {/* Tiny build marker — lets us verify the user is on the latest deploy */}
      <p className="text-[10px] text-gray-400 dark:text-[#333333] mt-12">build 2026-05-05-c</p>
    </div>
  );
}
