import React, { useState, useEffect } from 'react';
import { Zap, Copy, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { useToast } from '../components/ui/Toast';
import { OUTPUT_LANGUAGES, toastNativeName, formatLanguageOption } from '../lib/languages';
import type { OutputLanguage } from '../lib/languages';
import { useT } from '../i18n';

interface MultiPostOutput {
  x?: string[];
  instagram?: string;
  linkedin?: string;
}

const PLAN_LIMITS: Record<string, number> = { free: 3, pro: 100, ultra: 300 };
const PLAN_LABELS: Record<string, string> = { free: 'Free Plan', pro: 'Pro Plan', ultra: 'Max Plan' };

const MultiPost: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pastResults, setPastResults] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedResult, setSelectedResult] = useState('');
  const [language, setLanguage] = useState<OutputLanguage>(profile?.language || 'English');
  const [platforms, setPlatforms] = useState({
    x: true,
    instagram: true,
    linkedin: true,
  });
  const [output, setOutput] = useState<MultiPostOutput | null>(null);
  const [activeTab, setActiveTab] = useState<'x' | 'instagram' | 'linkedin'>('x');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const plan = profile?.plan ?? 'free';
  const isFree = plan === 'free';
  const planLabel = PLAN_LABELS[plan] ?? PLAN_LABELS.free;
  const monthlyLimit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const usage =
    profile?.repurposingUsageMonth === currentMonth ? (profile?.repurposingUsageThisMonth ?? 0) : 0;
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyFullThread = () => {
    if (!output?.x) return;
    handleCopy(output.x.join('\n\n'));
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
        <span className="text-xs text-[#888888] italic">Copy not available on Free Plan</span>
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
              <span className="text-[#888888] ml-2">({planLabel})</span>
            </p>
            {isFree && (
              <p className="text-xs text-[#888888] italic">{t('multipost.copyNotAvailable')}</p>
            )}
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-neutral-900 rounded-2xl border border-gray-800 p-8 mb-8">
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">{t('multipost.contentSource')}</label>
            <div className="flex gap-4 mb-4">
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
                <select
                  value={selectedResult}
                  onChange={(e) => {
                    setSelectedResult(e.target.value);
                    setTitle('');
                  }}
                  disabled={loading}
                  className="bg-neutral-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{t('multipost.pickPastResult')}</option>
                  {pastResults.map((result) => (
                    <option key={result.id} value={result.id}>
                      {result.title}
                    </option>
                  ))}
                </select>
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
            <select
              value={language}
              onChange={(e) => {
                const next = e.target.value as OutputLanguage;
                const prev = language;
                setLanguage(next);
                if (next !== 'English' && next !== prev) {
                  toast(`Output will be in ${toastNativeName(next)}`, 'info');
                }
              }}
              disabled={loading}
              className="w-full bg-neutral-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {OUTPUT_LANGUAGES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {formatLanguageOption(opt)}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-white font-semibold mb-3">{t('multipost.selectPlatforms')}</label>
            <div className="flex flex-wrap gap-3">
              {['x', 'instagram', 'linkedin'].map((platform) => (
                <label
                  key={platform}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-neutral-800 border-gray-700 cursor-pointer hover:border-orange-600/50 transition-all"
                >
                  <input
                    type="checkbox"
                    checked={platforms[platform as keyof typeof platforms]}
                    onChange={(e) =>
                      setPlatforms({
                        ...platforms,
                        [platform]: e.target.checked,
                      })
                    }
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
            <div className="flex gap-2 border-b border-gray-800">
              {(['x', 'instagram', 'linkedin'] as const).map((tab) => (
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

            {/* X Thread */}
            {activeTab === 'x' && output.x && (
              <div className="space-y-4">
                {output.x.map((tweet, idx) => (
                  <div key={idx} className="bg-neutral-900 rounded-2xl border border-gray-800 p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <span className="text-sm text-gray-400">Tweet {idx + 1}</span>
                      {renderCopyAction(tweet, 'px-3 py-1 text-sm')}
                    </div>
                    <p className="text-gray-100 leading-relaxed">{tweet}</p>
                  </div>
                ))}

                {isFree ? (
                  <div className="w-full py-3 rounded-lg text-center bg-neutral-900 border border-gray-800 text-[#888888] text-sm italic">
                    Copy not available on Free Plan — upgrade to Pro Plan or Max Plan
                  </div>
                ) : (
                  <button
                    onClick={copyFullThread}
                    className="w-full py-3 rounded-lg font-semibold transition-all bg-gray-800 text-white hover:bg-gray-700"
                  >
                    📋 Copy Full Thread
                  </button>
                )}
              </div>
            )}

            {/* Instagram */}
            {activeTab === 'instagram' && output.instagram && (
              <div className="bg-neutral-900 rounded-2xl border border-gray-800 p-8">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-lg font-bold text-white">Instagram Caption</h3>
                  {renderCopyAction(output.instagram)}
                </div>
                <p className="text-gray-100 leading-relaxed whitespace-pre-wrap">{output.instagram}</p>
              </div>
            )}

            {/* LinkedIn */}
            {activeTab === 'linkedin' && output.linkedin && (
              <div className="bg-neutral-900 rounded-2xl border border-gray-800 p-8">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-lg font-bold text-white">LinkedIn Post</h3>
                  {renderCopyAction(output.linkedin)}
                </div>
                <p className="text-gray-100 leading-relaxed whitespace-pre-wrap">{output.linkedin}</p>
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
