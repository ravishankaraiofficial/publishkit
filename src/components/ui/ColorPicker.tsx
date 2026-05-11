import { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { colorNameToHex } from '../../lib/colors';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  placeholder?: string;
}

export function ColorPicker({
  label,
  value,
  onChange,
  error,
  placeholder = 'e.g. "orange" or #FF5733',
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const hex = colorNameToHex(value);
  const validHex = /^#[0-9A-Fa-f]{6}$/.test(hex);
  const pickerHex = validHex ? hex : '#E05A1E';

  // Close picker when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="w-full" ref={wrapperRef}>
      <label className="block text-sm font-medium text-[#CFCFCF] mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        {/* Color swatch — click to open the picker */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-10 h-10 rounded-lg border-2 border-[#2A2A2A] cursor-pointer flex-shrink-0 transition-all hover:border-[#E05A1E]/60"
          style={{ background: validHex ? hex : '#2A2A2A' }}
          title="Click to open color picker"
          aria-label="Open color picker"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 h-10 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-sm text-white placeholder:text-[#555555] focus:outline-none focus:ring-2 focus:ring-[#E05A1E]/70 transition-colors"
        />
      </div>

      {/* Full-featured color picker popover */}
      {open && (
        <div className="mt-2 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl z-50">
          <HexColorPicker
            color={pickerHex}
            onChange={(newHex) => onChange(newHex.toUpperCase())}
            style={{ width: '100%' }}
          />
          <div className="flex items-center gap-2 mt-3">
            <div
              className="w-8 h-8 rounded-md border border-[#2A2A2A] flex-shrink-0"
              style={{ background: pickerHex }}
            />
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 h-8 rounded-md border border-[#2A2A2A] bg-[#0D0D0D] px-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#E05A1E]/70"
              placeholder="#E05A1E"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-[#888888] hover:text-white px-2 py-1 rounded border border-[#2A2A2A] hover:border-[#E05A1E]/60 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-sm text-[#EF4444]">{error}</p>}
      {value && !validHex && (
        <p className="mt-1 text-xs text-[#888888]">Type a color name or a hex like #E05A1E</p>
      )}
    </div>
  );
}
