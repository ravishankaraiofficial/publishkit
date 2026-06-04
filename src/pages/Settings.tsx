import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
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
import { isMeaningfulText, MEANINGFUL_ERROR } from '../lib/validateMeaningful';
import { useT } from '../i18n';
import { ChevronDown } from 'lucide-react';

// Zod refinement helpers — reject gibberish on free-text profile fields.
// Required field: must be present AND meaningful.
const meaningful = (max: number, minWords = 1) =>
  z
    .string()
    .max(max)
    .refine((v) => isMeaningfulText(v, { minWords }), { message: MEANINGFUL_ERROR });

// Optional field: empty string is OK (gets stripped on save); any non-empty
// value must be meaningful.
const meaningfulOptional = (max: number, minWords = 1) =>
  z
    .string()
    .max(max)
    .refine((v) => v.trim().length === 0 || isMeaningfulText(v, { minWords }), {
      message: MEANINGFUL_ERROR,
    })
    .optional();

// ────────────────────────────────────────────────────────────────────────────
// Schema
// ────────────────────────────────────────────────────────────────────────────
//
// Required (enforced at form-submit time):
//   name, handle, niche, language, appearance, brandColor1, brandColor2,
//   positioning, targetAudience, tone
//
// Everything else is optional. Empty strings on optional fields are stripped
// before the Firestore write so we don't pollute the user doc with blanks.
//
const profileSchema = z.object({
  // ── Required basics ──
  name: meaningful(120),
  // Handle stays loose — users can pick any handle they want.
  handle: z
    .string()
    .min(1, 'Handle is required')
    .regex(/^@?[\w.]+$/, 'Handle should be like @yourchannel'),
  niche: meaningful(120),
  language: z.enum(OUTPUT_LANGUAGE_VALUES),
  positioning: meaningful(200, 2),
  tone: z.string().min(1, 'Tone is required'),

  // ── Required for thumbnails ──
  appearance: meaningful(500, 2).refine((v) => v.trim().length >= 10, {
    message: 'Appearance must be at least 10 characters',
  }),
  brandColor1Raw: z.string().min(1, 'Brand color 1 is required'),
  brandColor2Raw: z.string().min(1, 'Brand color 2 is required'),

  // ── Required for audience-aware scripts ──
  targetAudience: meaningful(300, 2),

  // ── Recommended optionals ──
  audiencePainPoint: meaningfulOptional(500, 2),
  audienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'mixed', '']).optional(),
  audienceTransformation: meaningfulOptional(500, 2),
  catchphrases: meaningfulOptional(500),
  avoidWords: meaningfulOptional(500),
  hookStyle: meaningfulOptional(500),
  ctaStyle: meaningfulOptional(500),
  contentPillars: meaningfulOptional(500),
  preferredVideoLength: z.enum(['15', '30', '45', '60', '90', 'long', '']).optional(),

  // ── Advanced optionals ──
  age: z
    .union([z.string().length(0), z.coerce.number().int().min(10).max(120)])
    .optional(),
  whatMakesDifferent: meaningfulOptional(500, 2),
  personalStory: meaningfulOptional(1000, 3),
  credentials: meaningfulOptional(500),
  addressForm: z.enum(['tum', 'aap', 'mixed', 'na', '']).optional(),
  usesSlang: z.boolean().optional(),
  usesMemes: z.boolean().optional(),
  usesCursing: z.boolean().optional(),
  bestVideoHooks: meaningfulOptional(1500, 3),
  hookFormulas: meaningfulOptional(800, 2),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function blankToDelete(v: unknown): unknown {
  if (v === undefined || v === null) return deleteField();
  if (typeof v === 'string' && v.trim().length === 0) return deleteField();
  return v;
}

// ────────────────────────────────────────────────────────────────────────────
// Reusable collapsible section
// ────────────────────────────────────────────────────────────────────────────
function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-200 dark:border-[#2A2A2A] pt-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start justify-between gap-3 text-left active:scale-[0.99] transition-transform"
      >
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-white">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500 dark:text-[#888888] leading-relaxed">{subtitle}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 flex-shrink-0 mt-1 text-gray-500 dark:text-[#888888] transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && <div className="mt-5 space-y-5">{children}</div>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────
export function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const t = useT();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      name: profile?.name || '',
      handle: profile?.handle || '',
      niche: profile?.niche || '',
      language: profile?.language || 'English',
      positioning: profile?.positioning || '',
      tone: profile?.tone || 'Casual',
      appearance: profile?.appearance || '',
      brandColor1Raw: profile?.brandColor1 || '',
      brandColor2Raw: profile?.brandColor2 || '',
      targetAudience: profile?.targetAudience || '',
      audiencePainPoint: profile?.audiencePainPoint || '',
      audienceLevel: profile?.audienceLevel || '',
      audienceTransformation: profile?.audienceTransformation || '',
      catchphrases: profile?.catchphrases || '',
      avoidWords: profile?.avoidWords || '',
      hookStyle: profile?.hookStyle || '',
      ctaStyle: profile?.ctaStyle || '',
      contentPillars: profile?.contentPillars || '',
      preferredVideoLength: profile?.preferredVideoLength || '',
      age: profile?.age?.toString() || '',
      whatMakesDifferent: profile?.whatMakesDifferent || '',
      personalStory: profile?.personalStory || '',
      credentials: profile?.credentials || '',
      addressForm: profile?.addressForm || '',
      usesSlang: profile?.usesSlang ?? false,
      usesMemes: profile?.usesMemes ?? false,
      usesCursing: profile?.usesCursing ?? false,
      bestVideoHooks: profile?.bestVideoHooks || '',
      hookFormulas: profile?.hookFormulas || '',
    },
  });

  const watchedName = watch('name');

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;

    const brandColor1 = colorNameToHex(data.brandColor1Raw);
    const brandColor2 = colorNameToHex(data.brandColor2Raw);

    if (!brandColor1) {
      toast(t('settings.brandColorError1'), 'error');
      return;
    }
    if (!brandColor2) {
      toast(t('settings.brandColorError2'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      const handle = data.handle.startsWith('@') ? data.handle : `@${data.handle}`;

      // Build the update payload. Required fields are written as-is. Optional
      // fields use blankToDelete() so empty values become deleteField() and
      // don't pollute the user doc with empty strings.
      const payload: Record<string, unknown> = {
        // Required
        name: data.name,
        handle,
        niche: data.niche,
        language: data.language,
        positioning: data.positioning,
        tone: data.tone,
        appearance: data.appearance,
        brandColor1,
        brandColor2,
        targetAudience: data.targetAudience,

        // Optional (recommended)
        audiencePainPoint: blankToDelete(data.audiencePainPoint),
        audienceLevel: blankToDelete(data.audienceLevel),
        audienceTransformation: blankToDelete(data.audienceTransformation),
        catchphrases: blankToDelete(data.catchphrases),
        avoidWords: blankToDelete(data.avoidWords),
        hookStyle: blankToDelete(data.hookStyle),
        ctaStyle: blankToDelete(data.ctaStyle),
        contentPillars: blankToDelete(data.contentPillars),
        preferredVideoLength: blankToDelete(data.preferredVideoLength),

        // Optional (advanced)
        age:
          data.age === undefined || data.age === '' || data.age === null
            ? deleteField()
            : typeof data.age === 'number'
              ? data.age
              : Number(data.age),
        whatMakesDifferent: blankToDelete(data.whatMakesDifferent),
        personalStory: blankToDelete(data.personalStory),
        credentials: blankToDelete(data.credentials),
        addressForm: blankToDelete(data.addressForm),
        usesSlang: data.usesSlang ?? false,
        usesMemes: data.usesMemes ?? false,
        usesCursing: data.usesCursing ?? false,
        bestVideoHooks: blankToDelete(data.bestVideoHooks),
        hookFormulas: blankToDelete(data.hookFormulas),
      };

      await updateDoc(doc(db, 'users', user.uid), payload as Record<string, never>);
      await refreshProfile();
      toast(t('settings.saved'), 'success');
    } catch (error: any) {
      console.error(error);
      toast(error.message || 'Failed to save settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: textarea component with built-in label + counter
  const Textarea = (props: {
    label: string;
    hint?: string;
    placeholder?: string;
    rows?: number;
    required?: boolean;
    register: ReturnType<typeof register>;
    error?: string;
  }) => (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 dark:text-[#CFCFCF] mb-1.5">
        {props.label}
        {props.required && <span className="text-[#E05A1E] ml-1">*</span>}
      </label>
      {props.hint && (
        <p className="text-xs text-gray-400 dark:text-[#555555] mb-2 leading-relaxed">{props.hint}</p>
      )}
      <textarea
        {...props.register}
        rows={props.rows ?? 3}
        placeholder={props.placeholder}
        className="flex w-full rounded-lg border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#0D0D0D] px-3 py-2 text-sm text-white placeholder:text-gray-400 dark:text-[#555555] focus:outline-none focus:ring-2 focus:ring-[#E05A1E]/70 transition-colors resize-none"
      />
      {props.error && <p className="mt-1.5 text-sm text-[#EF4444]">{props.error}</p>}
    </div>
  );

  // Helper: pill-button toggle group
  const PillGroup = (props: {
    label: string;
    hint?: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-[#CFCFCF] mb-1.5">{props.label}</label>
      {props.hint && <p className="text-xs text-gray-400 dark:text-[#555555] mb-2">{props.hint}</p>}
      <div className="flex flex-wrap gap-2">
        {props.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => props.onChange(opt.value)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-95',
              props.value === opt.value
                ? 'bg-[#E05A1E] border-[#E05A1E] text-white shadow-[0_0_14px_rgba(224,90,30,0.3)]'
                : 'bg-transparent border-gray-200 dark:border-[#2A2A2A] text-gray-500 dark:text-[#888888] hover:border-[#E05A1E]/50 hover:text-white'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto">
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {t('settings.title')}
            {watchedName && (
              <span className="text-[#E05A1E] ml-2 text-xl font-semibold">({watchedName})</span>
            )}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-[#888888] leading-relaxed max-w-xl">
            {watchedName
              ? t('settings.subtitle', { name: watchedName })
              : t('settings.subtitleNoName')}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Mobile save button — sticky at top so it's always reachable */}
              <div className="sm:hidden flex justify-end">
                <Button type="submit" isLoading={isLoading}>
                  {t('settings.saveChanges')}
                </Button>
              </div>

              {/* ═══ Section 1 ═══ Required basics ═══ */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  {t('settings.section1.title')}
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-[#888888] leading-relaxed">
                  {t('settings.section1.subtitle')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label={t('settings.name.label') + ' *'}
                  placeholder={t('settings.name.placeholder')}
                  {...register('name')}
                  error={errors.name?.message}
                />
                <Input
                  label={t('settings.handle.label') + ' *'}
                  placeholder={t('settings.handle.placeholder')}
                  {...register('handle')}
                  error={errors.handle?.message}
                />
              </div>

              <Input
                label={t('settings.niche.label') + ' *'}
                placeholder={t('settings.niche.placeholder')}
                {...register('niche')}
                error={errors.niche?.message}
              />

              <Textarea
                label={t('settings.positioning.label')}
                required
                hint={t('settings.positioning.hint')}
                placeholder={t('settings.positioning.placeholder')}
                rows={2}
                register={register('positioning')}
                error={errors.positioning?.message}
              />

              <Controller
                name="language"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-[#CFCFCF] mb-1.5">
                      {t('settings.language.label')} *
                    </label>
                    <p className="text-xs text-gray-400 dark:text-[#555555] mb-2">
                      {t('settings.language.hint')}
                    </p>
                    <select
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className={cn(
                        'w-full py-3 px-4 rounded-xl text-sm font-medium border transition-all',
                        'bg-white dark:bg-[#0D0D0D] border-gray-200 dark:border-[#2A2A2A] text-white',
                        'focus:outline-none focus:border-[#E05A1E]/60 cursor-pointer'
                      )}
                    >
                      {OUTPUT_LANGUAGES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {formatLanguageOption(opt)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              />

              <Controller
                name="tone"
                control={control}
                render={({ field }) => (
                  <PillGroup
                    label={t('settings.tone.label') + ' *'}
                    hint={t('settings.tone.hint')}
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: 'Casual', label: t('settings.tone.casual') },
                      { value: 'Educational', label: t('settings.tone.educational') },
                      { value: 'Professional', label: t('settings.tone.professional') },
                      { value: 'Storytelling', label: t('settings.tone.storytelling') },
                      { value: 'Comedy / Witty', label: t('settings.tone.comedy') },
                    ]}
                  />
                )}
              />
              {errors.tone && <p className="mt-1.5 text-sm text-[#EF4444]">{errors.tone.message}</p>}

              {/* ═══ Section 2 ═══ Audience ═══ */}
              <div className="border-t border-gray-200 dark:border-[#2A2A2A] pt-5">
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  {t('settings.section2.title')}
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-[#888888] leading-relaxed">
                  {t('settings.section2.subtitle')}
                </p>
              </div>

              <Textarea
                label={t('settings.targetAudience.label')}
                required
                hint={t('settings.targetAudience.hint')}
                placeholder={t('settings.targetAudience.placeholder')}
                rows={2}
                register={register('targetAudience')}
                error={errors.targetAudience?.message}
              />

              <Textarea
                label={t('settings.audiencePainPoint.label')}
                hint={t('settings.audiencePainPoint.hint')}
                placeholder={t('settings.audiencePainPoint.placeholder')}
                rows={2}
                register={register('audiencePainPoint')}
                error={errors.audiencePainPoint?.message}
              />

              <Controller
                name="audienceLevel"
                control={control}
                render={({ field }) => (
                  <PillGroup
                    label={t('settings.audienceLevel.label')}
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={[
                      { value: '', label: t('settings.audienceLevel.skip') },
                      { value: 'beginner', label: t('settings.audienceLevel.beginner') },
                      { value: 'intermediate', label: t('settings.audienceLevel.intermediate') },
                      { value: 'advanced', label: t('settings.audienceLevel.advanced') },
                      { value: 'mixed', label: t('settings.audienceLevel.mixed') },
                    ]}
                  />
                )}
              />

              <Textarea
                label={t('settings.audienceTransformation.label')}
                hint={t('settings.audienceTransformation.hint')}
                placeholder={t('settings.audienceTransformation.placeholder')}
                rows={2}
                register={register('audienceTransformation')}
                error={errors.audienceTransformation?.message}
              />

              {/* ═══ Section 3 ═══ Visual identity ═══ */}
              <div className="border-t border-gray-200 dark:border-[#2A2A2A] pt-5">
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  {t('settings.section3.title')}
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-[#888888] leading-relaxed">
                  {t('settings.section3.subtitle')}
                </p>
              </div>

              <Textarea
                label={t('settings.appearance.label')}
                required
                hint={t('settings.appearance.hint')}
                placeholder={t('settings.appearance.placeholder')}
                rows={3}
                register={register('appearance')}
                error={errors.appearance?.message}
              />

              <div>
                <p className="text-xs text-gray-400 dark:text-[#555555] mb-3">
                  {t('settings.brandColors.hint', { color1: 'orange', hex1: '#FF5733' })}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Controller
                    name="brandColor1Raw"
                    control={control}
                    render={({ field }) => (
                      <ColorPicker
                        label={t('settings.brandColor1.label')}
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
                        label={t('settings.brandColor2.label')}
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.brandColor2Raw?.message}
                      />
                    )}
                  />
                </div>
              </div>

              {/* ═══ Section 4 ═══ Voice & tone (collapsible) ═══ */}
              <CollapsibleSection
                title={t('settings.section4.title')}
                subtitle={t('settings.section4.subtitle')}
              >
                <Textarea
                  label={t('settings.catchphrases.label')}
                  hint={t('settings.catchphrases.hint')}
                  placeholder={t('settings.catchphrases.placeholder')}
                  rows={2}
                  register={register('catchphrases')}
                />

                <Textarea
                  label={t('settings.avoidWords.label')}
                  hint={t('settings.avoidWords.hint')}
                  placeholder={t('settings.avoidWords.placeholder')}
                  rows={2}
                  register={register('avoidWords')}
                />

                <Textarea
                  label={t('settings.hookStyle.label')}
                  hint={t('settings.hookStyle.hint')}
                  rows={2}
                  register={register('hookStyle')}
                />

                <Textarea
                  label={t('settings.ctaStyle.label')}
                  hint={t('settings.ctaStyle.hint')}
                  rows={2}
                  register={register('ctaStyle')}
                />

                <Textarea
                  label={t('settings.contentPillars.label')}
                  hint={t('settings.contentPillars.hint')}
                  placeholder={t('settings.contentPillars.placeholder')}
                  rows={2}
                  register={register('contentPillars')}
                />

                <Controller
                  name="preferredVideoLength"
                  control={control}
                  render={({ field }) => (
                    <PillGroup
                      label={t('settings.preferredVideoLength.label')}
                      hint={t('settings.preferredVideoLength.hint')}
                      value={field.value || ''}
                      onChange={field.onChange}
                      options={[
                        { value: '', label: t('settings.length.skip') },
                        { value: '15', label: t('settings.length.15') },
                        { value: '30', label: t('settings.length.30') },
                        { value: '45', label: t('settings.length.45') },
                        { value: '60', label: t('settings.length.60') },
                        { value: '90', label: t('settings.length.90') },
                        { value: 'long', label: t('settings.length.long') },
                      ]}
                    />
                  )}
                />
              </CollapsibleSection>

              {/* ═══ Section 5 ═══ Advanced (collapsible) ═══ */}
              <CollapsibleSection
                title={t('settings.section5.title')}
                subtitle={t('settings.section5.subtitle')}
              >
                <Input
                  label={t('settings.age.label')}
                  type="number"
                  min={10}
                  max={120}
                  placeholder={t('settings.age.placeholder')}
                  {...register('age')}
                />

                <Textarea
                  label={t('settings.whatMakesDifferent.label')}
                  hint={t('settings.whatMakesDifferent.hint')}
                  rows={2}
                  register={register('whatMakesDifferent')}
                />

                <Textarea
                  label={t('settings.personalStory.label')}
                  hint={t('settings.personalStory.hint')}
                  rows={4}
                  register={register('personalStory')}
                />

                <Textarea
                  label={t('settings.credentials.label')}
                  hint={t('settings.credentials.hint')}
                  rows={2}
                  register={register('credentials')}
                />

                <Controller
                  name="addressForm"
                  control={control}
                  render={({ field }) => (
                    <PillGroup
                      label={t('settings.addressForm.label')}
                      hint={t('settings.addressForm.hint')}
                      value={field.value || ''}
                      onChange={field.onChange}
                      options={[
                        { value: '', label: t('settings.addressForm.skip') },
                        { value: 'tum', label: t('settings.addressForm.tum') },
                        { value: 'aap', label: t('settings.addressForm.aap') },
                        { value: 'mixed', label: t('settings.addressForm.mixed') },
                        { value: 'na', label: t('settings.addressForm.na') },
                      ]}
                    />
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Controller
                    name="usesSlang"
                    control={control}
                    render={({ field }) => (
                      <label
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all',
                          field.value
                            ? 'bg-[#E05A1E]/10 border-[#E05A1E]/60 text-gray-900 dark:text-white'
                            : 'bg-transparent border-gray-200 dark:border-[#2A2A2A] text-gray-500 dark:text-[#888888] hover:border-[#E05A1E]/40'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="w-4 h-4 accent-[#E05A1E]"
                        />
                        <span className="text-sm font-medium">{t('settings.usesSlang.label')}</span>
                      </label>
                    )}
                  />
                  <Controller
                    name="usesMemes"
                    control={control}
                    render={({ field }) => (
                      <label
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all',
                          field.value
                            ? 'bg-[#E05A1E]/10 border-[#E05A1E]/60 text-gray-900 dark:text-white'
                            : 'bg-transparent border-gray-200 dark:border-[#2A2A2A] text-gray-500 dark:text-[#888888] hover:border-[#E05A1E]/40'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="w-4 h-4 accent-[#E05A1E]"
                        />
                        <span className="text-sm font-medium">{t('settings.usesMemes.label')}</span>
                      </label>
                    )}
                  />
                  <Controller
                    name="usesCursing"
                    control={control}
                    render={({ field }) => (
                      <label
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all',
                          field.value
                            ? 'bg-[#E05A1E]/10 border-[#E05A1E]/60 text-gray-900 dark:text-white'
                            : 'bg-transparent border-gray-200 dark:border-[#2A2A2A] text-gray-500 dark:text-[#888888] hover:border-[#E05A1E]/40'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="w-4 h-4 accent-[#E05A1E]"
                        />
                        <span className="text-sm font-medium">{t('settings.usesCursing.label')}</span>
                      </label>
                    )}
                  />
                </div>

                <Textarea
                  label={t('settings.bestVideoHooks.label')}
                  hint={t('settings.bestVideoHooks.hint')}
                  placeholder={t('settings.bestVideoHooks.placeholder')}
                  rows={5}
                  register={register('bestVideoHooks')}
                />

                <Textarea
                  label={t('settings.hookFormulas.label')}
                  hint={t('settings.hookFormulas.hint')}
                  rows={3}
                  register={register('hookFormulas')}
                />
              </CollapsibleSection>

              {/* Save */}
              <div className="flex justify-end pt-2">
                <Button type="submit" isLoading={isLoading}>
                  {t('settings.saveChanges')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
