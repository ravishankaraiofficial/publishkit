import React, { useState, useEffect } from 'react';
import { Zap, Copy, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

interface RepurposingOutput {
  x?: string[];
  instagram?: string;
  linkedin?: string;
}

const RepurposingPlanner: React.FC = () => {
  const { user, profile } = useAuth();
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
  const [trialUsed, setTrialUsed] = useState(false);
  const [showTrialBanner, setShowTrialBanner] = useState(false);
  const [error, setError] = useState('');

  const currentPlan = profile?.plan || 'free';
  const isUltra = currentPlan === 'ultra';

  // Fetch past results for dropdown
  useEffect(() => {
    if (!user) return;

    const fetchPastResults = async () => {
      try {
        const resultsRef = collection(db, `users/${user.uid}/results`);
        const q = query(resultsRef, where('status', '==', 'complete'));
        const snap = await getDocs(q);
        const results = snap.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().audioFileName || 'Untitled',
        }));
        setPastResults(results.slice(0, 10)); // Last 10 results
      } catch (error) {
        console.error('Error fetching past results:', error);
      }
    };

    fetchPastResults();
  }, [user]);

  // Check trial status on mount
  useEffect(() => {
    if (!user || isUltra) return;

    const checkTrialStatus = async () => {
      try {
        const trialRef = doc(db, `users/${user.uid}/ultraTrials/repurposingPlanner`);
        const trialDoc = await getDoc(trialRef);

        if (trialDoc.exists()) {
          const lastTrialAt = trialDoc.data()?.lastTrialAt?.toDate?.() || new Date(trialDoc.data()?.lastTrialAt);
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

          if (lastTrialAt > sevenDaysAgo) {
            setTrialUsed(true);
          } else {
            setShowTrialBanner(true);
          }
        } else {
          setShowTrialBanner(true);
        }
      } catch (error) {
        console.error('Error checking trial status:', error);
      }
    };

    checkTrialStatus();
  }, [user, isUltra]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyTweet = (tweet: string) => {
    handleCopy(tweet);
  };

  const copyFullThread = () => {
    if (!output?.x) return;
    const thread = output.x.join('\n\n');
    handleCopy(thread);
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
      // If using past result, fetch its data
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
        {
          title: string;
          description: string;
          platforms: string[];
        },
        RepurposingOutput
      >(functions, 'generateRepurposing');

      const result = await generateRepurposing({
        title: contentTitle.trim(),
        description: contentDescription.trim(),
        platforms: selectedPlatforms,
      });

      setOutput(result.data);

      // Record trial usage if on Free/Pro
      if (!isUltra && showTrialBanner) {
        const trialRef = doc(db, `users/${user.uid}/ultraTrials/repurposingPlanner`);
        await setDoc(trialRef, {
          lastTrialAt: serverTimestamp(),
        });
        setShowTrialBanner(false);
        setTrialUsed(true);
      }
    } catch (err: any) {
      console.error('Error generating repurposing:', err);
      setError(err?.message || 'Failed to generate content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Locked state for non-Ultra users who used trial
  if (!isUltra && trialUsed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-900 via-neutral-950 to-black p-6 flex items-center justify-center">
        <div className="max-w-md bg-neutral-900 rounded-2xl border border-gray-800 p-8 text-center">
          <AlertCircle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Free Trial Used</h2>
          <p className="text-gray-400 mb-6">You've used your free Repurposing Planner trial this week. Upgrade to Ultra for unlimited access.</p>
          <button
            onClick={() => navigate('/pricing')}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold py-3 rounded-lg hover:from-orange-700 hover:to-orange-600 transition-all"
          >
            Upgrade to Ultra →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 via-neutral-950 to-black p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Repurposing Planner</h1>
          <p className="text-gray-400">Turn your content into tailored posts for X, Instagram, and LinkedIn</p>
        </div>

        {/* Trial Banner for Free/Pro users */}
        {!isUltra && showTrialBanner && (
          <div className="bg-gradient-to-r from-orange-600/20 to-orange-500/10 border border-orange-600/40 rounded-2xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-semibold">Free Preview</p>
                <p className="text-gray-300 text-sm">Output is visible but copy buttons are disabled. Upgrade to Ultra for full access.</p>
              </div>
            </div>
          </div>
        )}

        {/* Input Section */}
        <div className="bg-neutral-900 rounded-2xl border border-gray-800 p-8 mb-8">
          {/* Title Input or Past Results Selector */}
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
                  disabled={loading || (trialUsed && !isUltra)}
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
                  disabled={loading || (trialUsed && !isUltra)}
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

          {/* Description */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any additional context or key points..."
              rows={2}
              disabled={loading || !!selectedResult || (trialUsed && !isUltra)}
              className="w-full bg-neutral-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-600 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Platform Selection */}
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
                    disabled={loading || (trialUsed && !isUltra)}
                    className="w-4 h-4 accent-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-white font-medium capitalize">{platform}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mb-6">{error}</p>}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || (trialUsed && !isUltra)}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold py-3 rounded-lg hover:from-orange-700 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Generating Content...' : 'Generate Content'}
          </button>
        </div>

        {/* Output Section */}
        {output && (
          <div className="space-y-6">
            {/* Tabs */}
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
                      <button
                        onClick={() => copyTweet(tweet)}
                        disabled={!isUltra && showTrialBanner}
                        title={!isUltra && showTrialBanner ? 'Upgrade to Ultra to copy' : undefined}
                        className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-all ${
                          !isUltra && showTrialBanner
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                            : 'bg-gray-800 text-white hover:bg-gray-700'
                        }`}
                      >
                        <Copy className="w-4 h-4" />
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-gray-100 leading-relaxed">{tweet}</p>
                  </div>
                ))}

                {/* Copy Full Thread */}
                <button
                  onClick={copyFullThread}
                  disabled={!isUltra && showTrialBanner}
                  title={!isUltra && showTrialBanner ? 'Upgrade to Ultra to copy' : undefined}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    !isUltra && showTrialBanner
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  📋 Copy Full Thread
                </button>
              </div>
            )}

            {/* Instagram */}
            {activeTab === 'instagram' && output.instagram && (
              <div className="bg-neutral-900 rounded-2xl border border-gray-800 p-8">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-lg font-bold text-white">Instagram Caption</h3>
                  <button
                    onClick={() => handleCopy(output.instagram!)}
                    disabled={!isUltra && showTrialBanner}
                    title={!isUltra && showTrialBanner ? 'Upgrade to Ultra to copy' : undefined}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      !isUltra && showTrialBanner
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                        : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-gray-100 leading-relaxed whitespace-pre-wrap">{output.instagram}</p>
              </div>
            )}

            {/* LinkedIn */}
            {activeTab === 'linkedin' && output.linkedin && (
              <div className="bg-neutral-900 rounded-2xl border border-gray-800 p-8">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-lg font-bold text-white">LinkedIn Post</h3>
                  <button
                    onClick={() => handleCopy(output.linkedin!)}
                    disabled={!isUltra && showTrialBanner}
                    title={!isUltra && showTrialBanner ? 'Upgrade to Ultra to copy' : undefined}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      !isUltra && showTrialBanner
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                        : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
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
