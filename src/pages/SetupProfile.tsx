import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { PageContainer } from '../components/layout/PageContainer';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  appearance: z.string().min(10, 'Appearance must be at least 10 characters'),
  brandColor1: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g., #FF5733)'),
  brandColor2: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g., #0A7B6C)'),
  language: z.enum(['English', 'Hindi']),
  niche: z.string().min(1, 'Niche is required'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function SetupProfile() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      language: 'English',
      brandColor1: '#E05A1E',
      brandColor2: '#0D0D0D',
    }
  });

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        ...data,
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
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Setup Your Creator Profile</CardTitle>
            <CardDescription>
              This information is used to generate personalized titles, descriptions, and thumbnail prompts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Creator Name"
                  placeholder="Your YouTube channel name"
                  {...register('name')}
                  error={errors.name?.message}
                />

                <div className="w-full">
                  <label className="block text-sm font-medium text-[#CFCFCF] mb-1.5">Default Language</label>
                  <select
                    {...register('language')}
                    className="flex h-10 w-full rounded-md border border-[#2A2A2A] bg-[#0D0D0D] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E05A1E]/70 transition-colors"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                  </select>
                  {errors.language && <p className="mt-1.5 text-sm text-[#EF4444]">{errors.language.message}</p>}
                </div>
              </div>

              <Input
                label="Your Niche"
                placeholder="e.g. fitness for desk workers, tech reviews"
                {...register('niche')}
                error={errors.niche?.message}
              />

              <div className="w-full">
                <label className="block text-sm font-medium text-[#CFCFCF] mb-1.5">Your Appearance</label>
                <textarea
                  {...register('appearance')}
                  placeholder="e.g. Indian male, glasses, dark clothing (used for thumbnail prompts)"
                  className="flex min-h-[80px] w-full rounded-md border border-[#2A2A2A] bg-[#0D0D0D] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E05A1E]/70 transition-colors"
                />
                {errors.appearance && <p className="mt-1.5 text-sm text-[#EF4444]">{errors.appearance.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Brand Color 1 (Hex)"
                  placeholder="#FF5733"
                  {...register('brandColor1')}
                  error={errors.brandColor1?.message}
                />
                <Input
                  label="Brand Color 2 (Hex)"
                  placeholder="#0A7B6C"
                  {...register('brandColor2')}
                  error={errors.brandColor2?.message}
                />
              </div>

              <Button type="submit" isLoading={isLoading} className="w-full">
                Save Profile
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
