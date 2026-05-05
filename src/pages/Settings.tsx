import { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { PageContainer } from '../components/layout/PageContainer';
import { cn } from '../lib/utils';

// Convert a CSS color name OR a hex string to a valid #RRGGBB hex
function colorNameToHex(input: string): string {
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
    // ctx.fillStyle returns either a hex (#rrggbb) or "rgba(...)"
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

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  handle: z.string().min(1, 'Handle is required').regex(/^@?[\w.]+$/, 'Handle should be like @yourchannel'),
  appearance: z.string().min(10, 'Appearance must be at least 10 characters'),
  brandColor1Raw: z.string().min(1, 'Brand color 1 is required'),
  brandColor2Raw: z.string().min(1, 'Brand color 2 is required'),
  language: z.enum(['English', 'Hindi']),
  niche: z.string().min(1, 'Niche is required'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function ColorPreviewInput({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
}) {
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
          placeholder='e.g. "black" or #FF5733'
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
        <p className="mt-1 text-xs text-[#888888]">Type a color name like "orange" or a hex like #E05A1E</p>
      )}
    </div>
  );
}

export function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name || '',
      handle: (profile as any)?.handle || '',
      appearance: profile?.appearance || '',
      brandColor1Raw: profile?.brandColor1 || '',
      brandColor2Raw: profile?.brandColor2 || '',
      language: profile?.language || 'English',
      niche: profile?.niche || '',
    },
  });

  const watchedName = watch('name');

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;

    const brandColor1 = colorNameToHex(data.brandColor1Raw);
    const brandColor2 = colorNameToHex(data.brandColor2Raw);

    if (!brandColor1) {
      toast('Brand Color 1 is not a valid color name or hex code.', 'error');
      return;
    }
    if (!brandColor2) {
      toast('Brand Color 2 is not a valid color name or hex code.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const handle = data.handle.startsWith('@') ? data.handle : `@${data.handle}`;
      await updateDoc(doc(db, 'users', user.uid), {
        name: data.name,
        handle,
        appearance: data.appearance,
        brandColor1,
        brandColor2,
        language: data.language,
        niche: data.niche,
      });
      await refreshProfile();
      toast('Settings saved successfully', 'success');
    } catch (error: any) {
      console.error(error);
      toast(error.message || 'Failed to save settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto">

        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Creator Profile
            {watchedName && (
              <span className="text-[#E05A1E] ml-2 text-xl font-semibold">({watchedName})</span>
            )}
          </h1>
          <p className="mt-2 text-sm text-[#888888] leading-relaxed max-w-xl">
            Fill this in so PublishKit can personalise your AI-generated titles, descriptions, and thumbnail prompts to match{' '}
            <span className="text-[#CFCFCF] font-medium">your brand, your look, and your audience.</span>{' '}
            The more detail you give, the better and more relevant your results will be.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              {/* Mobile save button — sticky at top so it's always reachable */}
              <div className="sm:hidden flex justify-end">
                <Button type="submit" isLoading={isLoading}>
                  Save Changes
                </Button>
              </div>

              {/* Name + Handle row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Your Name / Channel Name"
                  placeholder="e.g. Tech With Rahul"
                  {...register('name')}
                  error={errors.name?.message}
                />
                <Input
                  label="YouTube Handle"
                  placeholder="e.g. @techwithrahul"
                  {...register('handle')}
                  error={errors.handle?.message}
                />
              </div>

              {/* Niche */}
              <Input
                label="Your Niche / Topic"
                placeholder="e.g. Tech reviews, finance, fitness, comedy..."
                {...register('niche')}
                error={errors.niche?.message}
              />

              {/* Appearance */}
              <div className="w-full">
                <label className="block text-sm font-medium text-[#CFCFCF] mb-1.5">
                  Your On-Camera Appearance
                </label>
                <p className="text-xs text-[#555555] mb-2">
                  Describe how you look on camera (face, hair, what you usually wear). This helps the AI design thumbnail prompts that feature <em>you</em>.
                </p>
                <textarea
                  {...register('appearance')}
                  rows={3}
                  placeholder="e.g. Indian male in his 20s, short hair, usually wearing a black hoodie or casual t-shirt"
                  className="flex w-full rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 py-2 text-sm text-white placeholder:text-[#555555] focus:outline-none focus:ring-2 focus:ring-[#E05A1E]/70 transition-colors resize-none"
                />
                {errors.appearance && (
                  <p className="mt-1.5 text-sm text-[#EF4444]">{errors.appearance.message}</p>
                )}
              </div>

              {/* Brand Colors */}
              <div>
                <p className="text-xs text-[#555555] mb-3">
                  Your brand colors are used to suggest thumbnail color schemes. Type a color name like <code className="text-[#E05A1E]">orange</code> or a hex code like <code className="text-[#E05A1E]">#FF5733</code>, or click the color swatch to pick.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Controller
                    name="brandColor1Raw"
                    control={control}
                    render={({ field }) => (
                      <ColorPreviewInput
                        label="Brand Color 1 (Primary)"
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.brandColor1Raw?.message}
                      />
                    )}
                  />
                  <Controller
                    name="brandColor2Raw"
                    control={control}
                    render={({ field }) => (
                      <ColorPreviewInput
                        label="Brand Color 2 (Accent)"
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.brandColor2Raw?.message}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Default Language — visual toggle */}
              <Controller
                name="language"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-sm font-medium text-[#CFCFCF] mb-2">
                      Default Output Language
                    </label>
                    <p className="text-xs text-[#555555] mb-3">
                      Choose which language your titles, descriptions and timestamps are generated in by default.
                    </p>
                    <div className="flex gap-3">
                      {(['English', 'Hindi'] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => field.onChange(lang)}
                          className={cn(
                            'flex-1 py-3 rounded-xl text-sm font-semibold border transition-all',
                            field.value === lang
                              ? 'bg-[#E05A1E] border-[#E05A1E] text-white shadow-[0_0_16px_rgba(224,90,30,0.35)]'
                              : 'bg-transparent border-[#2A2A2A] text-[#888888] hover:border-[#E05A1E]/50 hover:text-white'
                          )}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                    {errors.language && (
                      <p className="mt-1.5 text-sm text-[#EF4444]">{errors.language.message}</p>
                    )}
                  </div>
                )}
              />

              <div className="flex justify-end pt-2">
                <Button type="submit" isLoading={isLoading}>
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
