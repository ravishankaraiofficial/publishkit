import React, { useState } from 'react';
import { Zap, Copy, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

interface ScriptOutput {
  hook: string;
  intro: string;
  sections: Array<{ title: string; content: string }>;
  cta: string;
}

const PLAN_LIMITS: Record<string, number> = { free: 10, pro: 100, ultra: 1000 };
const PLAN_LABELS: Record<string, string> = { free: 'Free Plan', pro: 'Pro Plan', ultra: 'Max Plan' };

const ScriptWriter: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<'Casual' | 'Educational' | 'Storytelling'>('Casual');
  const [duration, setDuration] = useState<'5' | '10' | '15'>('10');
  const [language, setLanguage] = useState<'English' | 'Hindi'>(profile?.language || 'English');
  const [output, setOutput] = useState<ScriptOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const plan = profile?.plan ?? 'free';
  const isFree = plan === 'free';
  const planLabel = PLAN_LABELS[plan] ?? PLAN_LABELS.free;
  const monthlyLimit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const usage =
    profile?.scriptUsageMonth === currentMonth ? (profile?.scriptUsageThisMonth ?? 0) : 0;
  const limitReached = usage >= monthlyLimit;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyFullScript = () => {
    if (!output) return;
    const fullScript = `
${output.hook}

${output.intro}

${output.sections.map((s) => `${s.title}\n${s.content}`).join('\n\n')}

${output.cta}
`.trim();
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
        { topic: string; tone: string; duration: string; language: string },
        ScriptOutput
      >(functions, 'generateScript');

      const result = await generateScript({
        topic: topic.trim(),
        tone,
        duration,
        language,
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

  // Locked screen — monthly quota exhausted
  if (limitReached) {
    const headline = 'Monthly limit reached';
    const body =
      plan === 'ultra'
        ? `You've used your ${monthlyLimit} scripts for this month. Resets on the 1st.`
        : plan === 'pro'
        ? `You've used your ${monthlyLimit} scripts this month. Upgrade to Max Plan for 1000/month.`
        : `You've used your ${monthlyLimit} scripts this month. Upgrade to Pro Plan or Max Plan for more.`;
    const ctaLabel =
      plan === 'ultra'
        ? 'See plans'
        : plan === 'pro'
        ? 'Upgrade to Max Plan →'
        : 'Upgrade to Pro Plan or Max Plan →';

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
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 via-neutral-950 to-black p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">YouTube Script Writer</h1>
          <p className="text-gray-400">Generate engaging video scripts tailored to your niche</p>
        </div>

        {/* Usage counter — visible on every plan */}
        <div className="bg-neutral-900 border border-gray-800 rounded-2xl p-4 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-300">
              <span className="text-white font-semibold">{usage}</span> / {monthlyLimit} used this month
              <span className="text-[#888888] ml-2">({planLabel})</span>
            </p>
            {isFree && (
              <p className="text-xs text-[#888888] italic">Copy not available on Free Plan</p>
            )}
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-neutral-900 rounded-2xl border border-gray-800 p-8 mb-8">
          {/* Topic */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">Video Topic</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What is your video about? E.g., 'How to create viral content on TikTok'"
              rows={3}
              disabled={loading}
              className="w-full bg-neutral-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-600 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>

          {/* Grid: Tone, Duration, Language */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-white font-semibold mb-2">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as any)}
                disabled={loading}
                className="w-full bg-neutral-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option>Casual</option>
                <option>Educational</option>
                <option>Storytelling</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value as any)}
                disabled={loading}
                className="w-full bg-neutral-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                disabled={loading}
                className="w-full bg-neutral-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold py-3 rounded-lg hover:from-orange-700 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Generating Script...' : 'Generate Script'}
          </button>
        </div>

        {/* Output Section */}
        {output && (
          <div className="space-y-6">
            {/* Hook */}
            <div className="bg-neutral-900 rounded-2xl border border-gray-800 p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Hook (First 30 seconds)</h3>
                {renderCopyAction(output.hook)}
              </div>
              <p className="text-gray-100 leading-relaxed">{output.hook}</p>
            </div>

            {/* Intro */}
            <div className="bg-neutral-900 rounded-2xl border border-gray-800 p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Introduction</h3>
                {renderCopyAction(output.intro)}
              </div>
              <p className="text-gray-100 leading-relaxed">{output.intro}</p>
            </div>

            {/* Sections */}
            {output.sections.map((section, idx) => (
              <div key={idx} className="bg-neutral-900 rounded-2xl border border-gray-800 p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">{section.title}</h3>
                  {renderCopyAction(section.content)}
                </div>
                <p className="text-gray-100 leading-relaxed whitespace-pre-wrap">{section.content}</p>
              </div>
            ))}

            {/* CTA */}
            <div className="bg-neutral-900 rounded-2xl border border-gray-800 p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Call to Action</h3>
                {renderCopyAction(output.cta)}
              </div>
              <p className="text-gray-100 leading-relaxed">{output.cta}</p>
            </div>

            {/* Copy Full Script */}
            {isFree ? (
              <div className="w-full py-3 rounded-lg text-center bg-neutral-900 border border-gray-800 text-[#888888] text-sm italic">
                Copy not available on Free Plan — upgrade to Pro Plan or Max Plan
              </div>
            ) : (
              <button
                onClick={copyFullScript}
                className="w-full py-3 rounded-lg font-semibold transition-all bg-gradient-to-r from-orange-600 to-orange-500 text-white hover:from-orange-700 hover:to-orange-600"
              >
                📋 Copy Full Script
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

        {/* Spacer for mobile bottom nav */}
        <div className="sm:hidden h-16" />
      </div>
    </div>
  );
};

export default ScriptWriter;
