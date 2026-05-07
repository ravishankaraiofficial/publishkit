import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { PageContainer } from '../components/layout/PageContainer';
import { HexColorPicker } from 'react-colorful';
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
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-10 h-10 rounded-lg border-2 border-[#2A2A2A] cursor-pointer flex-shrink-0 transition-all hover:border-[#E05A1E]/60"
          style={{ background: validHex ? hex : '#2A2A2A' }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder='e.g. "orange" or #FF5733'
          className="flex-1 h-10 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 text-sm text-white placeholder:text-[#555555] focus:outline-none focus:ring-2 focus:ring-[#E05A1E]/70 transition-colors"
        />
      </div>
      {open && (
        <div className="mt-2 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl shadow-2xl z-50">
          <HexColorPicker
            color={pickerHex}
            onChange={(newHex) => onChange(newHex.toUpperCase())}
            style={{ width: '100%' }}
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full text-xs text-[#888888] hover:text-white px-2 py-1.5 rounded border border-[#2A2A2A] hover:border-[#E05A1E]/60 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-1.5 text-sm text-[#EF4444]">{error}</p>}
    </div>
  );
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

export function SetupProfile() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      language: 'English',
      brandColor1Raw: '#E05A1E',
      brandColor2Raw: '#0D0D0D',
    }
  });

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;

    const brandColor1 = colorNameToHex(data.brandColor1Raw);
    const brandColor2 = colorNameToHex(data.brandColor2Raw);

    if (!brandColor1 || !brandColor2) {
      toast('Please enter valid color names or hex codes.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const handle = data.handle.startsWith('@') ? data.handle : `@${data.handle}`;
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: data.name,
        handle,
        appearance: data.appearance,
        brandColor1,
        brandColor2,
        language: data.language,
        niche: data.niche,
        createdAt: serverTimestamp(),
        profileComplete: true,
      });
      await refreshProfile();
      toast('Profile set up successfully!', 'success');
      navigate('/');
    } catch (error: any) {
      console.error(error);
      toast(error.message || 'Failed to save profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-6 px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Setup Your Creator Profile</h1>
          <p className="mt-2 text-sm text-[#888888] leading-relaxed">
            Fill this in so PublishKit can personalise your AI-generated results to match your brand and audience.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Channel Name"
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

              <Input
                label="Your Niche"
                placeholder="e.g. tech reviews, fitness, comedy..."
                {...register('niche')}
                error={errors.niche?.message}
              />

              <div className="w-full">
                <label className="block text-sm font-medium text-[#CFCFCF] mb-1.5">Your On-Camera Appearance</label>
                <textarea
                  {...register('appearance')}
                  rows={3}
                  placeholder="e.g. Indian male in his 20s, usually wearing a black hoodie"
                  className="flex w-full rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 py-2 text-sm text-white placeholder:text-[#555555] focus:outline-none focus:ring-2 focus:ring-[#E05A1E]/70 transition-colors resize-none"
                />
                {errors.appearance && <p className="mt-1.5 text-sm text-[#EF4444]">{errors.appearance.message}</p>}
              </div>

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

              <Controller
                name="language"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-sm font-medium text-[#CFCFCF] mb-2">Default Language</label>
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
                  </div>
                )}
              />

              <Button type="submit" isLoading={isLoading} className="w-full py-3">
                Complete Setup
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
