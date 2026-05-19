import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  OUTPUT_LANGUAGES,
  formatLanguageOption,
  type OutputLanguage,
} from '../../lib/languages';

interface LanguagePickerProps {
  value: OutputLanguage;
  onChange: (value: OutputLanguage) => void;
  disabled?: boolean;
  className?: string;
}

export function LanguagePicker({
  value,
  onChange,
  disabled = false,
  className,
}: LanguagePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = OUTPUT_LANGUAGES.find((l) => l.value === value) ?? OUTPUT_LANGUAGES[0];

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center justify-center gap-2 min-w-[180px] w-full',
          'bg-[#1A1A1A] border border-[#2A2A2A] rounded-full px-5 py-2',
          'text-sm font-medium text-white text-center cursor-pointer',
          'transition-all duration-200 ease-out',
          'hover:bg-white/[0.04] hover:backdrop-blur-sm hover:border-[#E05A1E]/40 hover:ring-1 hover:ring-white/10',
          'focus:outline-none focus:border-[#E05A1E]/60',
          open && 'border-[#E05A1E]/60',
          disabled && 'opacity-60 cursor-not-allowed pointer-events-none',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{formatLanguageOption(selected)}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-[#888888] transition-transform duration-200',
            open && 'rotate-180 text-[#E05A1E]',
          )}
        />
      </button>

      {open && (
        <>
          {/* mobile-only backdrop tap-to-close */}
          <div
            className="sm:hidden fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <ul
            role="listbox"
            className={cn(
              'absolute z-50 left-1/2 -translate-x-1/2 mt-2 w-[260px] sm:w-[280px]',
              'bg-[#121212]/95 backdrop-blur-xl border border-[#2A2A2A] rounded-2xl',
              'shadow-2xl shadow-black/60 p-1.5',
              'max-h-[60vh] overflow-y-auto',
              'animate-fade-in',
            )}
          >
            {OUTPUT_LANGUAGES.map((opt) => {
              const isSel = opt.value === value;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSel}
                  tabIndex={0}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onChange(opt.value);
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    'flex items-center justify-between gap-3',
                    'px-4 py-3 sm:py-2.5 min-h-[44px] rounded-xl cursor-pointer',
                    'text-sm text-[#CFCFCF]',
                    'transition-all duration-150 ease-out',
                    'hover:bg-[#E05A1E] hover:text-white hover:font-semibold',
                    'hover:backdrop-blur-sm hover:ring-1 hover:ring-[#E05A1E]/40',
                    'hover:shadow-[0_4px_20px_-4px_rgba(224,90,30,0.5)]',
                    'focus:outline-none focus:bg-[#E05A1E] focus:text-white focus:font-semibold',
                    isSel && 'text-white',
                  )}
                >
                  <span className="truncate">{formatLanguageOption(opt)}</span>
                  {isSel && <Check className="w-4 h-4 flex-shrink-0" />}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
