import { useEffect, useRef, useState } from 'react';
import { Navbar } from './Navbar';
import { LanguageBar } from './LanguageBar';

// Selectors treated as "interactive content" — when the cursor enters these,
// the ambient orange glow dims so card/button content stays readable.
const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], [role="option"], [role="listbox"], ' +
  'input, select, textarea, label, ' +
  '[data-interactive], .card, [data-card]';

export function PageContainer({ children }: { children: React.ReactNode }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [overContent, setOverContent] = useState(false);
  const isTouchRef = useRef(false);

  useEffect(() => {
    // Skip cursor tracking on touch devices — render static ambient glow only.
    isTouchRef.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse)').matches;

    if (isTouchRef.current) {
      setPos({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
      return;
    }

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setPos({ x, y }));

      const target = e.target as Element | null;
      const inside = !!target?.closest(INTERACTIVE_SELECTOR);
      setOverContent(inside);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const glowOpacity = isTouchRef.current ? 0.4 : overContent ? 0.15 : 0.7;

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-[#0D0D0D] dark:text-white relative overflow-hidden font-sans">
      {/* Background Glow Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#E05A1E] rounded-full blur-[120px] opacity-[0.06] animate-float"></div>
        <div className="absolute top-[40%] right-[-5%] w-[30%] h-[30%] bg-[#FF7A3D] rounded-full blur-[100px] opacity-[0.06] animate-float-delayed"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-[#E05A1E] rounded-full blur-[110px] opacity-[0.06] animate-float-slow"></div>
      </div>

      {/* Ambient orange cursor glow — fades when cursor is over interactive content */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500 ease-out"
        style={{
          background: `radial-gradient(420px circle at ${pos.x}px ${pos.y}px, rgba(224,90,30,0.10) 0%, rgba(224,90,30,0.04) 35%, transparent 65%)`,
          opacity: glowOpacity,
        }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <LanguageBar />
        <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 pb-28 sm:pb-8 animate-fade-in">
          {children}
        </main>

        {/* Site footer with legal links — required by Google OAuth verification.
            Privacy + Terms must be reachable from the home page via a visible link. */}
        <footer className="relative z-10 border-t border-gray-200 dark:border-[#1A1A1A] mt-8 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-[#666]">
            <p>© {new Date().getFullYear()} PublishKit · Made in India 🇮🇳</p>
            <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
              <a href="/about" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                About
              </a>
              <a href="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Terms of Service
              </a>
              <a href="/pricing" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                Pricing
              </a>
              <a
                href="mailto:ravishankaraiofficial@gmail.com"
                className="hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Contact
              </a>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}
