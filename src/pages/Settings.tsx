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
import { ChevronDown } from 'lucide-react';

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
  name: z.string().min(1, 'Name is required'),
  handle: z
    .string()
    .min(1, 'Handle is required')
    .regex(/^@?[\w.]+$/, 'Handle should be like @yourchannel'),
  niche: z
    .string()
    .min(1, 'Niche is required')
    .max(120, 'Niche should be a short phrase (max 120 chars)'),
  language: z.enum(OUTPUT_LANGUAGE_VALUES),
  positioning: z
    .string()
    .min(1, 'One-line positioning is required')
    .max(200, 'Keep this to one short line (max 200 chars)'),
  tone: z.string().min(1, 'Tone is required'),

  // ── Required for thumbnails ──
  appearance: z.string().min(10, 'Appearance must be at least 10 characters'),
  brandColor1Raw: z.string().min(1, 'Brand color 1 is required'),
  brandColor2Raw: z.string().min(1, 'Brand color 2 is required'),

  // ── Required for audience-aware scripts ──
  targetAudience: z
    .string()
    .min(1, 'Target audience is required')
    .max(300, 'Keep this concise (max 300 chars)'),

  // ── Recommended optionals ──
  audiencePainPoint: z.string().max(500).optional(),
  audienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'mixed', '']).optional(),
  audienceTransformation: z.string().max(500).optional(),
  catchphrases: z.string().max(500).optional(),
  avoidWords: z.string().max(500).optional(),
  hookStyle: z.string().max(500).optional(),
  ctaStyle: z.string().max(500).optional(),
  contentPillars: z.string().max(500).optional(),
  preferredVideoLength: z.enum(['15', '30', '45', '60', '90', 'long', '']).optional(),

  // ── Advanced optionals ──
  age: z
    .union([z.string().length(0), z.coerce.number().int().min(10).max(120)])
    .optional(),
  whatMakesDifferent: z.string().max(500).optional(),
  personalStory: z.string().max(1000).optional(),
  credentials: z.string().max(500).optional(),
  addressForm: z.enum(['tum', 'aap', 'mixed', 'na', '']).optional(),
  usesSlang: z.boolean().optional(),
  usesMemes: z.boolean().optional(),
  usesCursing: z.boolean().optional(),
  bestVideoHooks: z.string().max(1500).optional(),
  hookFormulas: z.string().max(800).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const TONE_PRESETS = ['Casual', 'Educational', 'Professional', 'Storytelling', 'Comedy / Witty'];

// Strip an optional field that came back as empty / undefined / whitespace.
// Returns deleteField() so Firestore removes the key entirely instead of
// storing an empty string.
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
    <div className="border-t border-[#2A2A2A] pt-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start justify-between gap-3 text-left active:scale-[0.99] transition-transform"
      >
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-white">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-xs text-[#888888] leading-relaxed">{subtitle}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 flex-shrink-0 mt-1 text-[#888888] transition-transform',
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
      toast('Settings saved successfully', 'success');
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
      <label className="block text-sm font-medium text-[#CFCFCF] mb-1.5">
        {props.label}
        {props.required && <span className="text-[#E05A1E] ml-1">*</span>}
      </label>
      {props.hint && (
        <p className="text-xs text-[#555555] mb-2 leading-relaxed">{props.hint}</p>
      )}
      <textarea
        {...props.register}
        rows={props.rows ?? 3}
        placeholder={props.placeholder}
        className="flex w-full rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] px-3 py-2 text-sm text-white placeholder:text-[#555555] focus:outline-none focus:ring-2 focus:ring-[#E05A1E]/70 transition-colors resize-none"
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
      <label className="block text-sm font-medium text-[#CFCFCF] mb-1.5">{props.label}</label>
      {props.hint && <p className="text-xs text-[#555555] mb-2">{props.hint}</p>}
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
                : 'bg-transparent border-[#2A2A2A] text-[#888888] hover:border-[#E05A1E]/50 hover:text-white'
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
            Creator Profile
            {watchedName && (
              <span className="text-[#E05A1E] ml-2 text-xl font-semibold">({watchedName})</span>
            )}
          </h1>
          <p className="mt-2 text-sm text-[#888888] leading-relaxed max-w-xl">
            Fill this in so PublishKit's AI generates titles, descriptions, thumbnails,{' '}
            scripts, and social posts that sound like <span className="text-[#CFCFCF] font-medium">you</span>,
            not generic AI. Fields marked <span className="text-[#E05A1E]">*</span> are required.
            The rest are optional but each one sharpens your results.
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

              {/* ═══ Section 1 ═══ Required basics ═══ */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white">The basics</h3>
                <p className="mt-1 text-xs text-[#888888] leading-relaxed">
                  Required. Without these the AI can't even start.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Your name / channel name *"
                  placeholder="e.g. Tech With Rahul"
                  {...register('name')}
                  error={errors.name?.message}
                />
                <Input
                  label="YouTube handle *"
                  placeholder="e.g. @techwithrahul"
                  {...register('handle')}
                  error={errors.handle?.message}
                />
              </div>

              <Input
                label="Your niche / topic — be specific *"
                placeholder="e.g. AI tools for content creators (NOT just 'tech')"
                {...register('niche')}
                error={errors.niche?.message}
              />

              <Textarea
                label="One-line positioning"
                required
                hint='Who you are in 10 words. Example: "18 y/o building a 6-figure AI agency" or "Ex-doctor teaching evidence-based fitness".'
                placeholder="One short sentence that sums you up"
                rows={2}
                register={register('positioning')}
                error={errors.positioning?.message}
              />

              <Controller
                name="language"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-sm font-medium text-[#CFCFCF] mb-1.5">
                      Default output language *
                    </label>
                    <p className="text-xs text-[#555555] mb-2">
                      Used for titles, descriptions, timestamps, scripts, and MultiPost.
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
                  </div>
                )}
              />

              <Controller
                name="tone"
                control={control}
                render={({ field }) => (
                  <PillGroup
                    label="Default tone *"
                    hint="How you talk in your videos. You can override this per-script in Script Writer."
                    value={field.value}
                    onChange={field.onChange}
                    options={TONE_PRESETS.map((t) => ({ value: t, label: t }))}
                  />
                )}
              />
              {errors.tone && <p className="mt-1.5 text-sm text-[#EF4444]">{errors.tone.message}</p>}

              {/* ═══ Section 2 ═══ Audience ═══ */}
              <div className="border-t border-[#2A2A2A] pt-5">
                <h3 className="text-base sm:text-lg font-semibold text-white">Your audience</h3>
                <p className="mt-1 text-xs text-[#888888] leading-relaxed">
                  Telling the AI who you're talking TO is half the battle.
                </p>
              </div>

              <Textarea
                label="Who exactly watches your content"
                required
                hint='Age, profession, goals. Example: "20-25 year old Indian college students learning AI/coding"'
                placeholder="Be specific — age, what they do, what they want"
                rows={2}
                register={register('targetAudience')}
                error={errors.targetAudience?.message}
              />

              <Textarea
                label="Their biggest pain point you solve"
                hint="The single problem they wake up thinking about, that you address."
                placeholder='e.g. "They feel left behind by AI but every tutorial is for engineers"'
                rows={2}
                register={register('audiencePainPoint')}
                error={errors.audiencePainPoint?.message}
              />

              <Controller
                name="audienceLevel"
                control={control}
                render={({ field }) => (
                  <PillGroup
                    label="Their skill level in your niche"
                    value={field.value || ''}
                    onChange={field.onChange}
                    options={[
                      { value: '', label: 'Skip' },
                      { value: 'beginner', label: 'Beginner' },
                      { value: 'intermediate', label: 'Intermediate' },
                      { value: 'advanced', label: 'Advanced' },
                      { value: 'mixed', label: 'Mixed' },
                    ]}
                  />
                )}
              />

              <Textarea
                label="What they want to become after watching"
                hint="The transformation. Example: 'A confident creator who ships content weekly without burnout.'"
                placeholder="The version of themselves they aspire to"
                rows={2}
                register={register('audienceTransformation')}
                error={errors.audienceTransformation?.message}
              />

              {/* ═══ Section 3 ═══ Visual identity ═══ */}
              <div className="border-t border-[#2A2A2A] pt-5">
                <h3 className="text-base sm:text-lg font-semibold text-white">Visual identity</h3>
                <p className="mt-1 text-xs text-[#888888] leading-relaxed">
                  Required so thumbnail prompts feature YOU and your brand colors, not stock imagery.
                </p>
              </div>

              <Textarea
                label="Your on-camera appearance"
                required
                hint="Face, hair, what you usually wear. Helps thumbnails actually look like you."
                placeholder="e.g. Indian male in his 20s, short hair, usually wearing a black hoodie or casual t-shirt"
                rows={3}
                register={register('appearance')}
                error={errors.appearance?.message}
              />

              <div>
                <p className="text-xs text-[#555555] mb-3">
                  Brand colors — type a name like <code className="text-[#E05A1E]">orange</code> or a
                  hex code like <code className="text-[#E05A1E]">#FF5733</code>, or click the swatch.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Controller
                    name="brandColor1Raw"
                    control={control}
                    render={({ field }) => (
                      <ColorPicker
                        label="Brand color 1 (primary) *"
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
                        label="Brand color 2 (accent) *"
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
                title="Voice & tone — sharper scripts"
                subtitle="Optional, but every field here makes your scripts sound less generic."
              >
                <Textarea
                  label="Catchphrases you use often"
                  hint='Words/phrases your audience associates with you. Example: "Let me explain", "Big idea is this", "Pause the video right here".'
                  placeholder="Your signature lines, comma-separated"
                  rows={2}
                  register={register('catchphrases')}
                />

                <Textarea
                  label="Words / topics you NEVER use"
                  hint='Stuff that breaks your brand. Example: "Avoid corporate jargon, no swearing, never the word synergy"'
                  placeholder="Comma-separated"
                  rows={2}
                  register={register('avoidWords')}
                />

                <Textarea
                  label="How you usually START videos (hook style)"
                  hint='Examples: "I always open with a question", "Cold-open with the most shocking part", "Stat first, name second"'
                  rows={2}
                  register={register('hookStyle')}
                />

                <Textarea
                  label="How you usually END videos (CTA style)"
                  hint='Examples: "Follow for more AI tools", "Save this for later", "Comment your biggest takeaway"'
                  rows={2}
                  register={register('ctaStyle')}
                />

                <Textarea
                  label="Your content pillars (3-5 topics)"
                  hint="The main themes you post about. Helps AI stay on-brand across scripts."
                  placeholder='e.g. "AI tools, freelancing income, creator burnout, productivity"'
                  rows={2}
                  register={register('contentPillars')}
                />

                <Controller
                  name="preferredVideoLength"
                  control={control}
                  render={({ field }) => (
                    <PillGroup
                      label="Preferred video length"
                      hint="What duration works best for your audience? Script Writer will optimize pacing for this."
                      value={field.value || ''}
                      onChange={field.onChange}
                      options={[
                        { value: '', label: 'Skip' },
                        { value: '15', label: '15 sec' },
                        { value: '30', label: '30 sec' },
                        { value: '45', label: '45 sec' },
                        { value: '60', label: '60 sec' },
                        { value: '90', label: '90 sec' },
                        { value: 'long', label: '> 90 sec' },
                      ]}
                    />
                  )}
                />
              </CollapsibleSection>

              {/* ═══ Section 5 ═══ Advanced (collapsible) ═══ */}
              <CollapsibleSection
                title="Advanced — fine-tune your voice"
                subtitle="Power-user fields. Only fill what's relevant to you."
              >
                <Input
                  label="Your age (optional)"
                  type="number"
                  min={10}
                  max={120}
                  placeholder="e.g. 24"
                  {...register('age')}
                />

                <Textarea
                  label="What makes you different from others in your niche"
                  hint="Why someone should follow YOU vs the 100 others doing the same thing."
                  rows={2}
                  register={register('whatMakesDifferent')}
                />

                <Textarea
                  label="Your personal story (background, journey)"
                  hint="Journey, struggles, wins. This is what creates relatability in scripts."
                  rows={4}
                  register={register('personalStory')}
                />

                <Textarea
                  label="Credentials / proof you can mention"
                  hint="Followers, revenue, results, experience. Use only if it's genuinely yours."
                  rows={2}
                  register={register('credentials')}
                />

                <Controller
                  name="addressForm"
                  control={control}
                  render={({ field }) => (
                    <PillGroup
                      label="Hindi/Hinglish address-form (तुम / आप)"
                      hint='How you address your audience in Hindi videos. "Skip" if you only output English.'
                      value={field.value || ''}
                      onChange={field.onChange}
                      options={[
                        { value: '', label: 'Skip' },
                        { value: 'tum', label: 'तुम (tum)' },
                        { value: 'aap', label: 'आप (aap)' },
                        { value: 'mixed', label: 'Mixed' },
                        { value: 'na', label: 'English only' },
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
                            ? 'bg-[#E05A1E]/10 border-[#E05A1E]/60 text-white'
                            : 'bg-transparent border-[#2A2A2A] text-[#888888] hover:border-[#E05A1E]/40'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="w-4 h-4 accent-[#E05A1E]"
                        />
                        <span className="text-sm font-medium">I use slang</span>
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
                            ? 'bg-[#E05A1E]/10 border-[#E05A1E]/60 text-white'
                            : 'bg-transparent border-[#2A2A2A] text-[#888888] hover:border-[#E05A1E]/40'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="w-4 h-4 accent-[#E05A1E]"
                        />
                        <span className="text-sm font-medium">I reference memes</span>
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
                            ? 'bg-[#E05A1E]/10 border-[#E05A1E]/60 text-white'
                            : 'bg-transparent border-[#2A2A2A] text-[#888888] hover:border-[#E05A1E]/40'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="w-4 h-4 accent-[#E05A1E]"
                        />
                        <span className="text-sm font-medium">I curse / swear</span>
                      </label>
                    )}
                  />
                </div>

                <Textarea
                  label="Your 3 best-performing video hooks (copy-paste the openings)"
                  hint="If you have past hits, paste the first 2-3 lines here. AI will study what worked."
                  placeholder={`1. "I tried 5 AI tools so you don't have to..."\n2. "Stop scrolling — this Notion template just saved me ₹20,000..."\n3. ...`}
                  rows={5}
                  register={register('bestVideoHooks')}
                />

                <Textarea
                  label="Hook formulas that work for you"
                  hint='Examples: "money saved", "before vs after", "the one thing nobody tells you about X", "I was wrong about Y".'
                  rows={3}
                  register={register('hookFormulas')}
                />
              </CollapsibleSection>

              {/* Save */}
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
