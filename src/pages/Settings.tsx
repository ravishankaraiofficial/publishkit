import { useState } from 'react';
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
import { colorNameToHex } from '../lib/colors';
import { ColorPicker } from '../components/ui/ColorPicker';
import { OUTPUT_LANGUAGES, OUTPUT_LANGUAGE_VALUES, formatLanguageOption } from '../lib/languages';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  handle: z.string().min(1, 'Handle is required').regex(/^@?[\w.]+$/, 'Handle should be like @yourchannel'),
  appearance: z.string().min(10, 'Appearance must be at least 10 characters'),
  brandColor1Raw: z.string().min(1, 'Brand color 1 is required'),
  brandColor2Raw: z.string().min(1, 'Brand color 2 is required'),
  language: z.enum(OUTPUT_LANGUAGE_VALUES),
  niche: z.string().min(1, 'Niche is required'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

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
      handle: profile?.handle || '',
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
                      <ColorPicker
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
                      <ColorPicker
                        label="Brand Color 2 (Accent)"
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.brandColor2Raw?.message}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Default Language — 13-option dropdown */}
              <Controller
                name="language"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-sm font-medium text-[#CFCFCF] mb-2">
                      Default Output Language
                    </label>
                    <p className="text-xs text-[#555555] mb-3">
                      Choose which language your titles, descriptions, timestamps, scripts, and MultiPost output are generated in by default.
                    </p>
                    <select
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className={cn(
                        'w-full py-3 px-4 rounded-xl text-sm font-medium border transition-all',
                        'bg-[#0D0D0D] border-[#2A2A2A] text-white',
                        'focus:outline-none focus:border-[#E05A1E]/60 cursor-pointer'
                      )}
                    >
                      {OUTPUT_LANGUAGES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {formatLanguageOption(opt)}
                        </option>
                      ))}
                    </select>
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
