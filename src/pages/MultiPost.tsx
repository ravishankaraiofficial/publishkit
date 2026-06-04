import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Zap, Copy, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { useToast } from '../components/ui/Toast';
import { Picker } from '../components/ui/Picker';
import { LanguagePicker } from '../components/ui/LanguagePicker';
import { toastNativeName } from '../lib/languages';
import type { OutputLanguage } from '../lib/languages';
import { useT, useI18n } from '../i18n';
import { getRemainingMultiPostQuota } from '../lib/quota';

interface MultiPostOutput {
  x?: string[];
  instagram?: string[];
  linkedin?: string[];
  youtube?: string[];
}

const PLAN_LIMITS: Record<string, number> = { free: 3, pro: 100, ultra: 350 };
const PLAN_LABELS: Record<string, string> = { free: 'Free Plan', pro: 'Pro Plan', ultra: 'Max Plan' };

const MultiPost: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const { toast } = useToast();
  const { lang: uiLang } = useI18n();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pastResults, setPastResults] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedResult, setSelectedResult] = useState('');
  const [language, setLanguage] = useState<OutputLanguage>(uiLang);
  const [platforms, setPlatforms] = useState({
    x: true,
    instagram: true,
    linkedin: true,
    youtube: true,
  });
  const [output, setOutput] = useState<MultiPostOutput | null>(null);
  const [activeTab, setActiveTab] = useState<'x' | 'instagram' | 'linkedin' | 'youtube'>('x');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const plan = profile?.plan ?? 'free';
  const isFree = plan === 'free';
  const planLabel = PLAN_LABELS[plan] ?? PLAN_LABELS.free;
  const monthlyLimit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  let usage = profile?.repurposingUsage ?? 0;
  const cycleStartStr = profile?.usageCycleStart;
  if (cycleStartStr) {
    const cycleStartDate = new Date(cycleStartStr);
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - cycleStartDate.getTime() > THIRTY_DAYS_MS) {
      usage = 0; // Visually reset if cycle is expired
    }
  }
  const limitReached = usage >= monthlyLimit;

  // Fetch past results for dropdown
  useEffect(() => {
    if (!user) return;

    const fetchPastResults = async () => {
      try {
        const resultsRef = collection(db, `users/${user.uid}/results`);
        const q = query(resultsRef, where('status', '==', 'complete'));
        const snap = await getDocs(q);
        const results = snap.docs.map((d) => ({
          id: d.id,
          title: d.data().audioFileName || 'Untitled',
        }));
        setPastResults(results.slice(0, 10));
      } catch (err) {
        console.error('Error fetching past results:', err);
      }
    };

    fetchPastResults();
  }, [user]);

  useEffect(() => {
    setLanguage(uiLang);
  }, [uiLang]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async () => {
    if (!user || (!title.trim() && !selectedResult)) {
      setError('Please enter a title or select a past result');
      return;
    }

    const selectedPlatforms = Object.entries(platforms)
      .filter(([_, selected]) => selected)
      .map(([platform]) => platform);

    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform');
      return;
    }

    setLoading(true);
    setError('');
    setOutput(null);

    try {
      let contentTitle = title;
      let contentDescription = description;

      if (selectedResult) {
        const resultRef = doc(db, `users/${user.uid}/results/${selectedResult}`);
        const resultDoc = await getDoc(resultRef);
        if (resultDoc.exists()) {
          contentTitle = resultDoc.data().audioFileName || '';
          contentDescription = resultDoc.data().description || '';
        }
      }

      const generateRepurposing = httpsCallable<
        { title: string; description: string; platforms: string[]; language: OutputLanguage; visitorId?: string },
        MultiPostOutput
      >(functions, 'generateRepurposing');

      const { getVisitorId } = await import('../lib/fingerprint');
      const visitorId = await getVisitorId().catch(() => undefined);

      const result = await generateRepurposing({
        title: contentTitle.trim(),
        description: contentDescription.trim(),
        platforms: selectedPlatforms,
        language,
        visitorId,
      });

      setOutput(result.data);
      await refreshProfile();
    } catch (err: any) {
      console.error('Error generating MultiPost:', err);
      setError(err?.message || 'Failed to generate content. Please try again.');
      if (err?.code === 'functions/resource-exhausted' || err?.code === 'resource-exhausted') {
        await refreshProfile();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMore = async (platform: 'x' | 'instagram' | 'linkedin' | 'youtube') => {
    if (!user || (!title.trim() && !selectedResult)) return;

    setLoadingMore(platform);
    setError('');

    try {
      let contentTitle = title;
      let contentDescription = description;

      if (selectedResult) {
        const resultRef = doc(db, `users/${user.uid}/results/${selectedResult}`);
        const resultDoc = await getDoc(resultRef);
        if (resultDoc.exists()) {
          contentTitle = resultDoc.data().audioFileName || '';
          contentDescription = resultDoc.data().description || '';
        }
      }

      const generateRepurposing = httpsCallable<
        { title: string; description: string; platforms: string[]; language: OutputLanguage; visitorId?: string },
        MultiPostOutput
      >(functions, 'generateRepurposing');

      const { getVisitorId } = await import('../lib/fingerprint');
      const visitorId = await getVisitorId().catch(() => undefined);

      const result = await generateRepurposing({
        title: contentTitle.trim(),
        description: contentDescription.trim(),
        platforms: [platform],
        language,
        visitorId,
      });

      const newPostStr = result.data[platform]?.[0];
      if (newPostStr) {
        setOutput((prev) => {
          if (!prev) return prev;
          const currentArr = Array.isArray(prev[platform]) ? prev[platform] : prev[platform] ? [prev[platform] as string] : [];
          return {
            ...prev,
            [platform]: [...currentArr, newPostStr],
          };
        });
        
        // If there is an active selected result, we should also save this new post to Firestore
        if (selectedResult) {
          const resultRef = doc(db, `users/${user.uid}/results/${selectedResult}`);
          const prevDoc = await getDoc(resultRef);
          if (prevDoc.exists()) {
            const currentData = prevDoc.data();
            const currentArr = Array.isArray(currentData.multiPostOutput?.[platform]) 
              ? currentData.multiPostOutput[platform] 
              : currentData.multiPostOutput?.[platform] ? [currentData.multiPostOutput[platform]] : [];
            await updateDoc(resultRef, {
              [`multiPostOutput.${platform}`]: [...currentArr, newPostStr]
            });
          }
        }
      }
      await refreshProfile();
    } catch (err: any) {
      console.error('Error generating more MultiPost content:', err);
      setError(err?.message || 'Failed to generate content. Please try again.');
      if (err?.code === 'functions/resource-exhausted' || err?.code === 'resource-exhausted') {
        await refreshProfile();
      }
    } finally {
      setLoadingMore(null);
    }
  };

  // Locked screen — monthly quota exhausted
  if (limitReached) {
    const headline = 'Monthly limit reached';
    const body =
      plan === 'ultra'
        ? `You've used your ${monthlyLimit} MultiPost runs for this month. Resets on the 1st.`
        : plan === 'pro'
        ? `You've used your ${monthlyLimit} MultiPost runs this month. Upgrade to Max Plan for 300/month.`
        : `You've used your ${monthlyLimit} MultiPost runs this month. Upgrade to Pro Plan or Max Plan for more.`;
    const ctaLabel =
      plan === 'ultra'
        ? 'See plans'
        : plan === 'pro'
        ? 'Upgrade to Max Plan →'
        : 'Upgrade to Pro Plan or Max Plan →';

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
        <span className="text-xs text-gray-500 dark:text-[#888888] italic">Copy not available on Free Plan</span>
      );
    }
    return (
      <button
        onClick={() => handleCopy(text)}
        className={`flex items-center gap-2 ${sizeClass} rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-all`}
      >
        <Copy className="w-4 h-4" />
        {copied ? 'Copied!' : 'Copy'}
      </button>
    );
  };

  return (
    <PageContainer>
      <Helmet>
        <title>{t('seo.multiPost.title')}</title>
        <meta name="description" content={t('seo.multiPost.description')} />
        <link rel="canonical" href="https://publishkit.in/multipost" />
      </Helmet>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{t('nav.multipost')}</h1>
          <p className="text-gray-400">{t('multipost.subtitle')}</p>
        </div>

        {/* Usage counter — visible on every plan */}
        <div className="bg-neutral-900 border border-gray-800 rounded-2xl p-4 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-300">
              {t('multipost.usageCounter', { used: usage, limit: monthlyLimit })}
              <span className="text-gray-500 dark:text-[#888888] ml-2">({planLabel})</span>
            </p>
            {isFree && (
              <p className="text-xs text-gray-500 dark:text-[#888888] italic">{t('multipost.copyNotAvailable')}</p>
            )}
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-neutral-900 rounded-2xl border border-gray-800 p-8 mb-8">
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">{t('multipost.contentSource')}</label>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setSelectedResult('');
                  }}
                  placeholder={t('multipost.contentSourcePlaceholder')}
                  disabled={loading}
                  className="w-full bg-neutral-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              {pastResults.length > 0 && (
                <Picker
                  value={selectedResult}
                  options={[
                    { value: '', label: t('multipost.pickPastResult') },
                    ...pastResults.map((r) => ({ value: r.id, label: r.title })),
                  ]}
                  onChange={(next) => {
                    setSelectedResult(next);
                    setTitle('');
                  }}
                  disabled={loading}
                  className="min-w-[200px]"
                />
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">{t('multipost.descriptionOptional')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('multipost.descriptionPlaceholder')}
              rows={2}
              disabled={loading || !!selectedResult}
              className="w-full bg-neutral-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-600 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">{t('multipost.outputLanguage')}</label>
            <p className="text-xs text-gray-500 mb-3">
              {t('multipost.outputLanguageHelp')}
            </p>
            <LanguagePicker
              value={language}
              onChange={(next) => {
                const prev = language;
                setLanguage(next);
                if (next !== 'English' && next !== prev) {
                  toast(`Output will be in ${toastNativeName(next)}`, 'info');
                }
              }}
              disabled={loading}
              variant="input"
            />
          </div>

          <div className="mb-6">
            <label className="block text-white font-semibold mb-3">{t('multipost.selectPlatforms')}</label>
            <div className="flex flex-wrap gap-3">
              {['x', 'instagram', 'linkedin', 'youtube'].map((platform) => (
                <label
                  key={platform}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-neutral-800 border-gray-700 cursor-pointer hover:border-orange-600/50 transition-all"
                >
                  <input
                    type="checkbox"
                    checked={platforms[platform as keyof typeof platforms]}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      if (isChecked) {
                        const checkedCount = Object.values(platforms).filter(Boolean).length;
                        const quota = getRemainingMultiPostQuota(profile);
                        if (checkedCount >= quota) {
                          toast(`You only have ${quota} MultiPost generation${quota === 1 ? '' : 's'} remaining this month.`, 'error');
                          return;
                        }
                      }
                      setPlatforms({
                        ...platforms,
                        [platform]: isChecked,
                      });
                    }}
                    disabled={loading}
                    className="w-4 h-4 accent-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-white font-medium capitalize">{platform}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mb-6">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold py-3 rounded-lg hover:from-orange-700 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Generating Content...' : 'Generate Content'}
          </button>
        </div>

        {/* Output Section */}
        {output && (
          <div className="space-y-6">
            <div className="flex gap-2 border-b border-gray-800 overflow-x-auto">
              {(['x', 'instagram', 'linkedin', 'youtube'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  disabled={!output[tab]}
                  className={`px-6 py-3 font-semibold capitalize transition-all ${
                    activeTab === tab && output[tab]
                      ? 'text-orange-600 border-b-2 border-orange-600 -mb-px'
                      : output[tab]
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* X */}
            {activeTab === 'x' && output.x && (
              <div className="space-y-4">
                {output.x.map((tweet, idx) => (
                  <div key={idx} className="bg-neutral-900 rounded-2xl border border-gray-800 p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <span className="text-sm font-semibold text-gray-400">Option {idx + 1}</span>
                      {renderCopyAction(tweet, 'px-3 py-1 text-sm')}
                    </div>
                    <p className="text-gray-100 leading-relaxed whitespace-pre-wrap">{tweet}</p>
                  </div>
                ))}
                <button
                  onClick={() => handleGenerateMore('x')}
                  disabled={loadingMore === 'x'}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-4 border border-gray-700 hover:border-gray-600 rounded-xl text-gray-300 hover:text-white transition-all disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-orange-500" />
                  {loadingMore === 'x' ? 'Generating...' : 'Generate another option'}
                </button>
              </div>
            )}

            {/* Instagram */}
            {activeTab === 'instagram' && output.instagram && (
              <div className="space-y-4">
                {(Array.isArray(output.instagram) ? output.instagram : [output.instagram]).map((caption, idx) => (
                  <div key={idx} className="bg-neutral-900 rounded-2xl border border-gray-800 p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <span className="text-sm font-semibold text-gray-400">Option {idx + 1}</span>
                      {renderCopyAction(caption, 'px-3 py-1 text-sm')}
                    </div>
                    <p className="text-gray-100 leading-relaxed whitespace-pre-wrap">{caption}</p>
                  </div>
                ))}
                <button
                  onClick={() => handleGenerateMore('instagram')}
                  disabled={loadingMore === 'instagram'}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-4 border border-gray-700 hover:border-gray-600 rounded-xl text-gray-300 hover:text-white transition-all disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-orange-500" />
                  {loadingMore === 'instagram' ? 'Generating...' : 'Generate another option'}
                </button>
              </div>
            )}

            {/* LinkedIn */}
            {activeTab === 'linkedin' && output.linkedin && (
              <div className="space-y-4">
                {(Array.isArray(output.linkedin) ? output.linkedin : [output.linkedin]).map((post, idx) => (
                  <div key={idx} className="bg-neutral-900 rounded-2xl border border-gray-800 p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <span className="text-sm font-semibold text-gray-400">Option {idx + 1}</span>
                      {renderCopyAction(post, 'px-3 py-1 text-sm')}
                    </div>
                    <p className="text-gray-100 leading-relaxed whitespace-pre-wrap">{post}</p>
                  </div>
                ))}
                <button
                  onClick={() => handleGenerateMore('linkedin')}
                  disabled={loadingMore === 'linkedin'}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-4 border border-gray-700 hover:border-gray-600 rounded-xl text-gray-300 hover:text-white transition-all disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-orange-500" />
                  {loadingMore === 'linkedin' ? 'Generating...' : 'Generate another option'}
                </button>
              </div>
            )}

            {/* YouTube */}
            {activeTab === 'youtube' && output.youtube && (
              <div className="space-y-4">
                {(Array.isArray(output.youtube) ? output.youtube : [output.youtube]).map((post, idx) => (
                  <div key={idx} className="bg-neutral-900 rounded-2xl border border-gray-800 p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <span className="text-sm font-semibold text-gray-400">Option {idx + 1}</span>
                      {renderCopyAction(post, 'px-3 py-1 text-sm')}
                    </div>
                    <p className="text-gray-100 leading-relaxed whitespace-pre-wrap">{post}</p>
                  </div>
                ))}
                <button
                  onClick={() => handleGenerateMore('youtube')}
                  disabled={loadingMore === 'youtube'}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-4 border border-gray-700 hover:border-gray-600 rounded-xl text-gray-300 hover:text-white transition-all disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-orange-500" />
                  {loadingMore === 'youtube' ? 'Generating...' : 'Generate another option'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!output && !loading && (
          <div className="bg-neutral-900 rounded-2xl border border-dashed border-gray-700 p-12 text-center">
            <Zap className="w-12 h-12 text-orange-600 mx-auto mb-4 opacity-50" />
            <p className="text-gray-400">Generate MultiPost content to get started</p>
          </div>
        )}

      </div>
    </PageContainer>
  );
};

export default MultiPost;
