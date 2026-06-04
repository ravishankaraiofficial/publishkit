import { useState } from 'react';
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
import { cn } from '../lib/utils';
import { colorNameToHex } from '../lib/colors';
import { ColorPicker } from '../components/ui/ColorPicker';

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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Setup Your Creator Profile</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-[#888888] leading-relaxed">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-[#CFCFCF] mb-1.5">Your On-Camera Appearance</label>
                <textarea
                  {...register('appearance')}
                  rows={3}
                  placeholder="e.g. Indian male in his 20s, usually wearing a black hoodie"
                  className="flex w-full rounded-lg border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#0D0D0D]/50 backdrop-blur-sm px-3 py-2 text-sm text-white placeholder:text-gray-400 dark:text-[#555555] focus:outline-none focus:ring-2 focus:ring-[#E05A1E]/70 transition-colors resize-none"
                />
                {errors.appearance && <p className="mt-1.5 text-sm text-[#EF4444]">{errors.appearance.message}</p>}
              </div>

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

              <Controller
                name="language"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-[#CFCFCF] mb-2">Default Language</label>
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
                              : 'bg-transparent border-gray-200 dark:border-[#2A2A2A] text-gray-500 dark:text-[#888888] hover:border-[#E05A1E]/50 hover:text-white'
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
