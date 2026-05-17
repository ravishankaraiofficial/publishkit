import React, { useState, useEffect } from 'react';
import { Zap, Copy, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

interface RepurposingOutput {
  x?: string[];
  instagram?: string;
  linkedin?: string;
}

const RepurposingPlanner: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pastResults, setPastResults] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedResult, setSelectedResult] = useState('');
  const [platforms, setPlatforms] = useState({
    x: true,
    instagram: true,
    linkedin: true,
  });
  const [output, setOutput] = useState<RepurposingOutput | null>(null);
  const [activeTab, setActiveTab] = useState<'x' | 'instagram' | 'linkedin'>('x');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const plan = profile?.plan ?? 'free';
  const isFree = plan === 'free';
  const isPro = plan === 'pro';
  const isUltra = plan === 'ultra';

  const currentMonth = new Date().toISOString().slice(0, 7);
  const ultraUsage =
    profile?.repurposingUsageMonth === currentMonth ? (profile?.repurposingUsageThisMonth ?? 0) : 0;

  const trialUsed = (() => {
    if (isUltra) return ultraUsage >= 1000;
    const last = profile?.repurposingTrialLastUsedAt?.toDate?.();
    if (!last) return false;
    const windowDays = isPro ? 7 : 30;
    return Date.now() - last.getTime() < windowDays * 24 * 60 * 60 * 1000;
  })();

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
        { title: string; description: string; platforms: string[] },
        RepurposingOutput
      >(functions, 'generateRepurposing');

      const result = await generateRepurposing({
        title: contentTitle.trim(),
        description: contentDescription.trim(),
        platforms: selectedPlatforms,
      });

      setOutput(result.data);
      await refreshProfile();
    } catch (err: any) {
      console.error('Error generating repurposing:', err);
      setError(err?.message || 'Failed to generate content. Please try again.');
      if (err?.code === 'functions/resource-exhausted' || err?.code === 'resource-exhausted') {
        await refreshProfile();
      }
    } finally {
      setLoading(false);
    }
  };

  // Locked screen — trial / monthly quota exhausted
  if (trialUsed) {
    const headline = isUltra ? 'Monthly limit reached' : 'Trial used';
    const body = isUltra
      ? "You've used your 1000 repurposing runs for this month. Resets on the 1st."
      : isPro
      ? "You've used your Repurposing Planner trial this week. Upgrade to Ultra for 1000/month."
      : "You've used your Repurposing Planner trial this month. Upgrade to Pro or Ultra for more.";
    const ctaLabel = isUltra ? 'See plans' : isPro ? 'Upgrade to Ultra →' : 'Upgrade to Pro or Ultra →';

    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-900 via-neutral-950 to-black p-6 flex items-center justify-center">
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
    );
  }

  const renderCopyAction = (text: string, sizeClass: string = 'px-4 py-2') => {
    if (isFree) {
      return (
        <span className="text-xs text-[#888888] italic">Copy not available on Free plan</span>
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
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 via-neutral-950 to-black p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Repurposing Planner</h1>
          <p className="text-gray-400">Turn your content into tailored posts for X, Instagram, and LinkedIn</p>
        </div>

        {/* Plan banner */}
        {isFree && (
          <div className="bg-gradient-to-r from-orange-600/20 to-orange-500/10 border border-orange-600/40 rounded-2xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-semibold">Free plan</p>
                <p className="text-gray-300 text-sm">
                  1 trial per month. Output is visible but copy buttons are not available on Free.
                  Upgrade for monthly access and full copy support.
                </p>
              </div>
            </div>
          </div>
        )}
        {isUltra && (
          <div className="bg-neutral-900 border border-gray-800 rounded-2xl p-4 mb-8">
            <p className="text-sm text-gray-300">
              <span className="text-white font-semibold">{ultraUsage}</span> / 1000 used this month
            </p>
          </div>
        )}

        {/* Input Section */}
        <div className="bg-neutral-900 rounded-2xl border border-gray-800 p-8 mb-8">
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">Content Source</label>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setSelectedResult('');
                  }}
                  placeholder="Enter video title or YouTube title"
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
                  <option value="">Or pick a past result...</option>
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
            <label className="block text-white font-semibold mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any additional context or key points..."
              rows={2}
              disabled={loading || !!selectedResult}
              className="w-full bg-neutral-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-600 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="mb-6">
            <label className="block text-white font-semibold mb-3">Select Platforms</label>
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
                    Copy not available on Free plan — upgrade to Pro or Ultra
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
            <p className="text-gray-400">Generate repurposed content to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RepurposingPlanner;
