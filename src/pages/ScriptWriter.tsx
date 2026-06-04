import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Zap, Copy, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { useToast } from '../components/ui/Toast';
import { Picker } from '../components/ui/Picker';
import { LanguagePicker } from '../components/ui/LanguagePicker';
import { DropZone } from '../components/upload/DropZone';
import { useUpload } from '../hooks/useUpload';
import { toastNativeName } from '../lib/languages';
import type { OutputLanguage } from '../lib/languages';
import { useT, useI18n } from '../i18n';
import { Shield } from 'lucide-react';
import { ProcessingCard } from '../components/upload/ProcessingCard';

interface ScriptOutput {
  script: string;
  analysis: string;
}

const TONE_OPTIONS = [
  { value: 'Casual', label: 'Casual' },
  { value: 'Educational', label: 'Educational' },
  { value: 'Storytelling', label: 'Storytelling' },
];

const DURATION_OPTIONS = [
  { value: '30s', label: '30 Seconds' },
  { value: '1m', label: '1 Minute' },
  { value: '5', label: '5 Minutes' },
  { value: '10', label: '10 Minutes' },
  { value: '15', label: '15 Minutes' },
];

const PLAN_LIMITS: Record<string, number> = { free: 3, pro: 100, ultra: 350 };
const PLAN_LABELS: Record<string, string> = { free: 'Free Plan', pro: 'Pro Plan', ultra: 'Max Plan' };

const ScriptWriter: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const t = useT();
  const { lang: uiLang } = useI18n();
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<string>('Casual');
  const [duration, setDuration] = useState<string>('30s');
  const [language, setLanguage] = useState<OutputLanguage>(uiLang);
  const [output, setOutput] = useState<ScriptOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const {
    setUploadMode,
    setScriptTone,
    setScriptDuration,
    isUploading,
    uploadProgress,
    statusIndex,
    statusCycle,
    result,
    handleFileSelect,
    reset
  } = useUpload();

  React.useEffect(() => {
    setUploadMode('script');
    setScriptTone(tone);
    setScriptDuration(duration);
  }, [tone, duration, setUploadMode, setScriptTone, setScriptDuration]);

  React.useEffect(() => {
    setLanguage(uiLang);
  }, [uiLang]);

  // Sync file upload result to local output state
  React.useEffect(() => {
    if (result && result.status === 'complete' && result.script) {
      setOutput(result as any);
    }
  }, [result]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => reset();
  }, []);

  const translatedToneOptions = TONE_OPTIONS.map(opt => ({
    ...opt,
    label: opt.value === 'Casual' ? t('script.toneCasual') : 
           opt.value === 'Educational' ? t('script.toneEducational') : 
           t('script.toneStorytelling')
  }));

  const translatedDurationOptions = DURATION_OPTIONS.map(opt => ({
    ...opt,
    label: opt.value === '30s' ? t('script.duration30s', { defaultValue: '30 Seconds' }) : 
           opt.value === '1m' ? t('script.duration1m', { defaultValue: '1 Minute' }) :
           t('script.durationMinutes', { count: parseInt(opt.value) })
  }));

  const plan = profile?.plan ?? 'free';
  const isFree = plan === 'free';
  const planLabel = PLAN_LABELS[plan] ?? PLAN_LABELS.free;
  const monthlyLimit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  let usage = profile?.scriptUsage ?? 0;
  const cycleStartStr = profile?.usageCycleStart;
  if (cycleStartStr) {
    const cycleStartDate = new Date(cycleStartStr);
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - cycleStartDate.getTime() > THIRTY_DAYS_MS) {
      usage = 0; // Visually reset if cycle is expired
    }
  }
  const limitReached = usage >= monthlyLimit;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyFullScript = () => {
    if (!output) return;
    const fullScript = `${output.script}\n\n--- Analysis ---\n${output.analysis}`.trim();
    handleCopy(fullScript);
  };

  const handleGenerate = async () => {
    if (!user || !topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setLoading(true);
    setError('');
    setOutput(null);

    try {
      const generateScript = httpsCallable<
        { topic: string; tone: string; duration: string; language: string; visitorId?: string },
        ScriptOutput
      >(functions, 'generateScript');

      const { getVisitorId } = await import('../lib/fingerprint');
      const visitorId = await getVisitorId().catch(() => undefined);

      const result = await generateScript({
        topic: topic.trim(),
        tone,
        duration,
        language,
        visitorId,
      });

      setOutput(result.data);
      // Pull the server-updated counter so the UI reflects new state
      await refreshProfile();
    } catch (err: any) {
      console.error('Error generating script:', err);
      setError(err?.message || 'Failed to generate script. Please try again.');
      // If we hit the server-side limit, refresh so the locked screen renders on next paint
      if (err?.code === 'functions/resource-exhausted' || err?.code === 'resource-exhausted') {
        await refreshProfile();
      }
    } finally {
      setLoading(false);
    }
  };

  // Locked screen â€” monthly quota exhausted
  if (limitReached) {
    const headline = t('script.monthlyLimitReached');
    let body = '';
    let ctaLabel = '';

    if (plan === 'ultra') {
      body = t('script.limitUltra', { limit: monthlyLimit });
      ctaLabel = t('script.upgradeUltra');
    } else if (plan === 'pro') {
      body = t('script.limitPro', { limit: monthlyLimit, nextLimit: 1000 });
      ctaLabel = t('script.upgradePro');
    } else {
      body = t('script.limitFree', { limit: monthlyLimit });
      ctaLabel = t('script.upgradeFree');
    }

    return (
      <PageContainer>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="max-w-md bg-neutral-900 rounded-2xl border border-gray-800 p-8 text-center">
            <AlertCircle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">{headline}</h2>
            <p className="text-gray-400 mb-6">{body}</p>
            <button
              onClick={() => navigate('/pricing')}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold py-3 rounded-lg hover:from-orange-700 hover:to-orange-600 transition-all"
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      </PageContainer>
    );
  }

  const renderCopyAction = (text: string, sizeClass: string = 'px-4 py-2') => {
    if (isFree) {
      return (
        <span className="text-xs text-gray-500 dark:text-[#888888] italic">{t('multipost.copyNotAvailable')}</span>
      );
    }
    return (
      <button
        onClick={() => handleCopy(text)}
        className={`flex items-center gap-2 ${sizeClass} rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-all`}
      >
        <Copy className="w-4 h-4" />
        {copied ? t('common.copied') : t('common.copy')}
      </button>
    );
  };

  return (
    <PageContainer>
      <Helmet>
        <title>{t('seo.scriptWriter.title')}</title>
        <meta name="description" content={t('seo.scriptWriter.description')} />
        <link rel="canonical" href="https://publishkit.in/script-writer" />
      </Helmet>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{t('script.title')}</h1>
          <p className="text-gray-400">{t('script.subtitle')}</p>
        </div>

        {/* Usage counter â€” visible on every plan */}
        <div className="bg-neutral-900 border border-gray-800 rounded-2xl p-4 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-300">
              {t('script.usageCounter', { used: usage, limit: monthlyLimit })}
              <span className="text-gray-500 dark:text-[#888888] ml-2">({planLabel})</span>
            </p>
            {isFree && (
              <p className="text-xs text-gray-500 dark:text-[#888888] italic">{t('multipost.copyNotAvailable')}</p>
            )}
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-neutral-900 rounded-2xl border border-gray-800 p-8 mb-8">
          {/* Dropzone Area */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">{t('script.dropzoneHeadline')}</h2>
            <p className="text-gray-400 mb-6">{t('script.dropzoneSubtitle')}</p>
            
            {!isUploading ? (
              <DropZone
                onFileSelect={handleFileSelect}
                isLoading={isUploading}
              />
            ) : (
              <ProcessingCard
                statusText={statusCycle[statusIndex] || "Processing..."}
                uploadProgress={uploadProgress}
              />
            )}
            
            {(isUploading || loading) && (
              <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl flex items-center justify-center text-center font-medium animate-pulse">
                {t('script.resultComing')}
              </div>
            )}
            {!isUploading && !loading && output && (
              <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center text-center font-medium">
                {t('script.resultGenerated')}
              </div>
            )}

            <div className="mt-6 flex flex-col items-center gap-2 text-sm text-gray-500">
              <div className="flex items-center gap-1.5 text-emerald-500/80 bg-emerald-500/10 px-3 py-1 rounded-full">
                <Shield className="w-4 h-4" />
                <span>{t('script.dropzonePrivacy')}</span>
              </div>
              <p>{t('script.dropzoneSupported')}</p>
            </div>
          </div>

          <div className="relative flex items-center py-5">
            <div className="flex-grow border-t border-gray-800"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-sm font-medium uppercase tracking-wider">OR TYPE A TOPIC</span>
            <div className="flex-grow border-t border-gray-800"></div>
          </div>

          {/* Topic */}
          <div className="mb-6 mt-2">
            <label className="block text-white font-semibold mb-2">{t('script.topicLabel')}</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t('script.topicPlaceholder')}
              rows={3}
              disabled={loading || isUploading}
              className="w-full bg-neutral-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-600 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>

          {/* Grid: Tone, Duration, Language */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="min-w-0">
              <label className="block text-white font-semibold mb-2">{t('script.toneLabel')}</label>
              <Picker
                value={tone}
                options={translatedToneOptions}
                onChange={(next) => setTone(next as any)}
                disabled={loading}
                variant="input"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-white font-semibold mb-2">{t('script.durationLabel')}</label>
              <Picker
                value={duration}
                options={translatedDurationOptions}
                onChange={(next) => setDuration(next as any)}
                disabled={loading || isUploading}
                variant="input"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-white font-semibold mb-2">{t('script.languageLabel')}</label>
              <LanguagePicker
                value={language}
                onChange={(next) => {
                  const prev = language;
                  setLanguage(next);
                  if (next !== 'English' && next !== prev) {
                    toast(`Output will be in ${toastNativeName(next)}`, 'info');
                  }
                }}
                disabled={loading || isUploading}
                variant="input"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || isUploading}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold py-3 rounded-lg hover:from-orange-700 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? t('script.generatingBtn') : t('script.generateBtn')}
          </button>
        </div>

        {/* Output Section */}
        {output && (
          <div className="space-y-6">
            {/* The Script */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">The Script</h3>
                {renderCopyAction(output.script)}
              </div>
              <p className="text-gray-700 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">{output.script}</p>
            </div>

            {/* Copy Full Script */}
            {isFree ? (
              <div className="w-full py-3 rounded-lg text-center bg-neutral-900 border border-gray-800 text-gray-500 dark:text-[#888888] text-sm italic">
                Copy not available on Free Plan â€” upgrade to Pro Plan or Max Plan
              </div>
            ) : (
              <button
                onClick={copyFullScript}
                className="w-full py-3 rounded-lg font-semibold transition-all bg-gradient-to-r from-orange-600 to-orange-500 text-white hover:from-orange-700 hover:to-orange-600"
              >
                {t('script.copyFullScript')}
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!output && !loading && (
          <div className="bg-neutral-900 rounded-2xl border border-dashed border-gray-700 p-12 text-center">
            <Zap className="w-12 h-12 text-orange-600 mx-auto mb-4 opacity-50" />
            <p className="text-gray-400">Generate a script to get started</p>
          </div>
        )}

      </div>
    </PageContainer>
  );
};

export default ScriptWriter;
