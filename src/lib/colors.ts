// Convert a CSS color name OR a hex string to a valid #RRGGBB hex
export function colorNameToHex(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toUpperCase();

  // Draw on a hidden canvas to resolve CSS color names
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000000'; // reset
    ctx.fillStyle = trimmed;
    const computed = ctx.fillStyle as string;
    
    // ctx.fillStyle returns either a hex (#rrggbb) or "rgba(...)" or "rgb(...)"
    if (/^#[0-9a-f]{6}$/i.test(computed)) {
      return computed.toUpperCase();
    }
    
    const m = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      return (
        '#' +
        [m[1], m[2], m[3]]
          .map((n) => parseInt(n).toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase()
      );
    }
  } catch (_) {}
  return ''; // invalid
}
