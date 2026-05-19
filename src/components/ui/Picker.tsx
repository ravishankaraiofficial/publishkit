import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PickerOption<T extends string> {
  value: T;
  label: string;
  /** Optional secondary label shown right of the main label */
  hint?: string;
}

export interface PickerProps<T extends string> {
  value: T;
  options: PickerOption<T>[];
  onChange: (next: T) => void;
  /** Render override for the trigger label (defaults to selected option's label) */
  renderTriggerLabel?: (opt: PickerOption<T>) => ReactNode;
  /** Render override for each item (defaults to label + optional hint) */
  renderItem?: (opt: PickerOption<T>) => ReactNode;
  disabled?: boolean;
  className?: string;
  /** Pill-style trigger (default) vs full-width input-style trigger */
  variant?: 'pill' | 'input';
  placeholder?: string;
}

export function Picker<T extends string>({
  value,
  options,
  onChange,
  renderTriggerLabel,
  renderItem,
  disabled = false,
  className,
  variant = 'input',
  placeholder = 'Select…',
}: PickerProps<T>) {
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

  const selected = options.find((o) => o.value === value);

  const triggerBase =
    variant === 'pill'
      ? 'flex items-center justify-center gap-2 min-w-[180px] rounded-full px-5 py-2 text-center'
      : 'flex items-center justify-between gap-2 w-full rounded-xl px-4 py-3 text-left';

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          triggerBase,
          'bg-[#1A1A1A]/50 border border-[#2A2A2A] text-sm font-medium text-white cursor-pointer',
          'transition-all duration-200 ease-out',
          'hover:bg-white/[0.04] hover:backdrop-blur-sm hover:border-[#E05A1E]/40 hover:ring-1 hover:ring-white/10',
          'focus:outline-none focus:border-[#E05A1E]/60',
          open && 'border-[#E05A1E]/60',
          disabled && 'opacity-60 cursor-not-allowed pointer-events-none',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">
          {selected
            ? renderTriggerLabel
              ? renderTriggerLabel(selected)
              : selected.label
            : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-[#888888] transition-transform duration-200 flex-shrink-0',
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
              'absolute z-50 mt-2 w-full min-w-[220px]',
              variant === 'pill' && 'left-1/2 -translate-x-1/2 w-[260px] sm:w-[280px]',
              'bg-[#121212]/95 backdrop-blur-xl border border-[#2A2A2A] rounded-2xl',
              'shadow-2xl shadow-black/60 p-1.5',
              'max-h-[60vh] overflow-y-auto',
              'animate-fade-in',
            )}
          >
            {options.map((opt) => {
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
                  <span className="truncate">
                    {renderItem ? renderItem(opt) : opt.label}
                  </span>
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
