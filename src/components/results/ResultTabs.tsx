import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { type Result } from '../../types';
import { cn } from '../../lib/utils';
import { CopyButton } from './CopyButton';
import { useAuth } from '../../hooks/useAuth';
import { db, functions } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { OutputLanguage } from '../../lib/languages';
import { Zap } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface ResultTabsProps {
  result: Result;
}

function isDocumentResult(result: Result): boolean {
  const ft = result.fileType || '';
  return ft === 'application/pdf' || ft.startsWith('image/');
}

export function ResultTabs({ result }: ResultTabsProps) {
  const isDoc = isDocumentResult(result);

  const [activeTab, setActiveTab] = useState<string>(isDoc ? 'summary' : 'titles');
  const [chatGPTCopied, setChatGPTCopied] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [mpCopiedKey, setMpCopiedKey] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState<string | null>(null);
  const { user, profile, signInWithGoogle, refreshProfile } = useAuth();
  const { toast } = useToast();
  const isFreePlan = (profile?.plan ?? 'free') === 'free';

  const handleGenerateMore = async (platform: 'x' | 'instagram' | 'linkedin' | 'youtube') => {
    if (!user) return;
    
    setLoadingMore(platform);
    
    try {
      const contentTitle = result.titles?.[0]?.title || result.summary?.slice(0, 200) || result.audioFileName || '';
      const contentDescription = result.description || '';

      const generateRepurposing = httpsCallable<
        { title: string; description: string; platforms: string[]; language: OutputLanguage; visitorId?: string },
        any
      >(functions, 'generateRepurposing');

      const { getVisitorId } = await import('../../lib/fingerprint');
      const visitorId = await getVisitorId().catch(() => undefined);

      const res = await generateRepurposing({
        title: contentTitle.trim(),
        description: contentDescription.trim(),
        platforms: [platform],
        language: profile?.language || 'English',
        visitorId,
      });

      const newPostStr = res.data[platform]?.[0];
      if (newPostStr) {
        const resultRef = doc(db, `users/${user.uid}/results/${result.id}`);
        const prevDoc = await getDoc(resultRef);
        if (prevDoc.exists()) {
          const currentData = prevDoc.data();
          const currentArr = Array.isArray(currentData.multiPostOutput?.[platform]) 
            ? currentData.multiPostOutput[platform] 
            : currentData.multiPostOutput?.[platform] ? [currentData.multiPostOutput[platform]] : [];
          
          await updateDoc(resultRef, {
            [`multiPostOutput.${platform}`]: [...currentArr, newPostStr]
          });
          // Mutate local state so UI updates immediately (ResultTabs receives 'result' as prop, but React state can force a re-render if we use a separate state or just mutate the prop since it's an object)
          // Actually, mutability of props is bad but it's the easiest here unless we lift state. We can mutate it:
          if (!result.multiPostOutput) result.multiPostOutput = {};
          result.multiPostOutput[platform] = [...currentArr, newPostStr];
        }
      }
      await refreshProfile();
    } catch (err: any) {
      console.error('Error generating more MultiPost content:', err);
      toast(err?.message || 'Failed to generate content. Please try again.', 'error');
      if (err?.code === 'functions/resource-exhausted' || err?.code === 'resource-exhausted') {
        await refreshProfile();
      }
    } finally {
      setLoadingMore(null);
    }
  };

  if (isDoc) {
    return (
      <div className="w-full">
        <div className="flex flex-wrap gap-2 mb-6">
          {(['summary', 'description'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all capitalize",
                activeTab === tab
                  ? "bg-[#E05A1E] text-white shadow-[0_0_18px_rgba(224,90,30,0.3)]"
                  : "bg-transparent border border-gray-200 dark:border-[#2A2A2A] text-gray-500 dark:text-[#888888] hover:text-white hover:border-[#E05A1E]/60"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'summary' && (
          <div className="relative bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-2xl p-6 pt-14">
            <CopyButton text={result.summary || ''} />
            <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-[#CFCFCF] leading-relaxed text-sm">
              {result.summary || ''}
            </pre>
          </div>
        )}

        {activeTab === 'description' && (
          <div className="relative bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-2xl p-6 pt-14">
            <CopyButton text={result.description || ''} />
            <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-[#CFCFCF] leading-relaxed text-sm">
              {result.description || ''}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // Audio result — titles / timestamps / description / optional thumbnails
  const tabs = [
    { id: 'titles', label: 'Titles' },
    { id: 'timestamps', label: 'Timestamps' },
    { id: 'description', label: 'Description' },
  ] as const;

  const visibleTabs: { id: string; label: string }[] = [...tabs];
  if (result.thumbnailPromptImagen || (result.partialErrors && result.partialErrors.thumbnails)) {
    visibleTabs.push({ id: 'thumbnails', label: 'Thumbnail Prompts' });
  }
  if (result.multiPostOutput) {
    visibleTabs.push({ id: 'multipost', label: 'MultiPost' });
  }

  const renderContent = () => {
    // Check for partial errors for the current tab
    const hasError = result.partialErrors?.[activeTab];
    const errorMessage = hasError || null;

    switch (activeTab) {
      case 'titles': {
        const copyTitle = async (text: string, idx: number) => {
          await navigator.clipboard.writeText(text);
          setCopiedIndex(idx);
          setTimeout(() => setCopiedIndex(null), 2000);
        };

        return (
          <div className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-2xl p-6">
            {errorMessage ? (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-4 mb-4">
                <p className="text-[#EF4444] text-sm font-medium">Generation Error</p>
                <p className="text-[#EF4444]/80 text-xs mt-1">{errorMessage}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(result.titles || []).map((t, i) => (
                  <div key={i} className="group relative bg-gray-50 dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#2A2A2A] rounded-xl p-4 hover:border-[#E05A1E]/40 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                          {i + 1}. {t.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-[#888888] italic mt-1.5 leading-relaxed">{t.reason}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyTitle(t.title, i)}
                        className={`flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border transition-all ${
                          copiedIndex === i
                            ? 'border-[#10B981]/50 bg-[#10B981]/10 text-[#10B981]'
                            : 'border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#0D0D0D] text-gray-500 dark:text-[#888888] hover:text-gray-900 dark:hover:text-white hover:border-[#E05A1E]/60'
                        }`}
                      >
                        {copiedIndex === i ? (
                          <><Check className="w-3.5 h-3.5" />Copied</>  
                        ) : (
                          <><Copy className="w-3.5 h-3.5" />Copy</>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'timestamps': {
        const lines = (result.timestamps || '').split('\n').filter(l => l.trim().length > 0);
        
        // Parsing logic: Separate lines into chapters if the AI provided headings
        const structuredChapters: { title: string; items: string[] }[] = [];
        let currentChapter: { title: string; items: string[] } | null = null;

        lines.forEach((line) => {
          // Check if line starts with a timestamp (e.g., "0:00" or "10:22")
          const startsWithTimestamp = /^\d{1,2}:\d{2}/.test(line.trim());

          if (!startsWithTimestamp) {
            // This is a Chapter Heading
            if (currentChapter) structuredChapters.push(currentChapter);
            currentChapter = { title: line.trim(), items: [] };
          } else {
            // This is a Timestamp
            if (!currentChapter) {
              currentChapter = { title: 'General', items: [] };
            }
            currentChapter.items.push(line.trim());
          }
        });
        if (currentChapter) structuredChapters.push(currentChapter);

        // Fallback: If AI didn't provide headings but we have many lines, use naive chunking
        const finalChapters = (structuredChapters.length > 1 || (structuredChapters.length === 1 && structuredChapters[0].title !== 'General'))
          ? structuredChapters
          : (lines.length >= 8 
              ? Array.from({ length: Math.ceil(lines.length / 4) }, (_, i) => ({
                  title: `Chapter ${i + 1}`,
                  items: lines.slice(i * 4, (i + 1) * 4)
                }))
              : [{ title: '', items: lines }]
            );

        return (
          <div className="relative bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-2xl p-6 pt-14 space-y-10">
            {errorMessage ? (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-4">
                <p className="text-[#EF4444] text-sm font-medium">Generation Error</p>
                <p className="text-[#EF4444]/80 text-xs mt-1">{errorMessage}</p>
              </div>
            ) : (
              <>
                <CopyButton text={result.timestamps || ''} />
                {finalChapters.map((chapter, idx) => (
                  <div 
                    key={idx} 
                    className="transition-all duration-300 ease-out"
                    style={{ 
                      animation: `fadeInUp 400ms cubic-bezier(0.23, 1, 0.32, 1) ${idx * 60}ms both`
                    }}
                  >
                    <style>{`
                      @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(12px); }
                        to { opacity: 1; transform: translateY(0); }
                      }
                    `}</style>
                    {chapter.title && (
                      <h4 className="text-[#E05A1E] font-bold text-xs mb-3 uppercase tracking-[0.15em] opacity-90">
                        {chapter.title}
                      </h4>
                    )}
                    <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-[#CFCFCF] leading-relaxed text-sm bg-gray-50 dark:bg-[#0D0D0D]/30 p-4 rounded-xl border border-gray-200 dark:border-[#2A2A2A]/50 shadow-inner">
                      {chapter.items.join('\n')}
                    </pre>
                  </div>
                ))}
              </>
            )}
          </div>
        );
      }

      case 'description':
        return (
          <div className="relative bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-2xl p-6 pt-14">
            {errorMessage ? (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-4">
                <p className="text-[#EF4444] text-sm font-medium">Generation Error</p>
                <p className="text-[#EF4444]/80 text-xs mt-1">{errorMessage}</p>
              </div>
            ) : (
              <>
                <CopyButton text={result.description || ''} />
                <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-[#CFCFCF] leading-relaxed text-sm">
                  {result.description}
                </pre>
              </>
            )}
          </div>
        );

      case 'thumbnails': {
        const thumbText = `IMAGEN 3 PROMPT:\n${result.thumbnailPromptImagen}\n\nCHATGPT / DALL-E 3 PROMPT:\n${result.thumbnailPromptChatGPT}`;
        
        const openChatGPT = async () => {
          if (user?.isAnonymous) {
            await signInWithGoogle();
            return;
          }
          if (!result.thumbnailPromptChatGPT) return;
          const url = `https://chatgpt.com/?q=${encodeURIComponent(result.thumbnailPromptChatGPT)}`;
          window.open(url, '_blank');
        };

        const openImagen = async () => {
          if (user?.isAnonymous) {
            await signInWithGoogle();
            return;
          }
          if (!result.thumbnailPromptImagen) return;
          await navigator.clipboard.writeText(result.thumbnailPromptImagen);
          window.open('https://aitestkitchen.withgoogle.com/tools/image-fx', '_blank');
        };

        const copyAndNotifyChatGPT = async () => {
          if (user?.isAnonymous) {
            await signInWithGoogle();
            return;
          }
          if (!result.thumbnailPromptChatGPT) return;
          await navigator.clipboard.writeText(result.thumbnailPromptChatGPT);
          setChatGPTCopied(true);
          setTimeout(() => setChatGPTCopied(false), 2000);
        };

        return (
          <div className="relative bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-2xl p-6 pt-14 space-y-8">
            {errorMessage ? (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-4">
                <p className="text-[#EF4444] text-sm font-medium">Generation Error</p>
                <p className="text-[#EF4444]/80 text-xs mt-1">{errorMessage}</p>
              </div>
            ) : (
              <>
                <CopyButton text={thumbText} />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Google Imagen 3 Prompt</h4>
                    <span className="text-[10px] bg-[#E05A1E]/10 text-[#E05A1E] px-2 py-0.5 rounded-full border border-[#E05A1E]/20">Best for Realism</span>
                  </div>
                  <p className="text-gray-700 dark:text-[#CFCFCF] bg-gray-50 dark:bg-[#0D0D0D] p-4 rounded-xl border border-gray-200 dark:border-[#2A2A2A] text-sm leading-relaxed shadow-inner">
                    {result.thumbnailPromptImagen}
                  </p>
                  <button 
                    onClick={openImagen}
                    className="w-full py-3 rounded-xl bg-transparent border border-[#E05A1E]/40 text-[#E05A1E] hover:bg-[#E05A1E]/10 transition-all text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Generate Thumbnail from Imagen
                  </button>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-[#2A2A2A]">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">ChatGPT / DALL-E 3 Prompt</h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={copyAndNotifyChatGPT}
                        className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border transition-all ${
                          chatGPTCopied
                            ? 'border-[#10B981]/50 bg-[#10B981]/10 text-[#10B981]'
                            : 'border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#0D0D0D] text-gray-500 dark:text-[#888888] hover:text-gray-900 dark:hover:text-white hover:border-[#E05A1E]/60'
                        }`}
                      >
                        {chatGPTCopied ? <><Check className="w-3.5 h-3.5" />Copied ✓</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
                      </button>
                      <span className="text-[10px] bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded-full border border-[#10B981]/20">Best for Bold Graphics</span>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-[#CFCFCF] bg-gray-50 dark:bg-[#0D0D0D] p-4 rounded-xl border border-gray-200 dark:border-[#2A2A2A] text-sm leading-relaxed shadow-inner">
                    {result.thumbnailPromptChatGPT}
                  </p>
                  <button 
                    onClick={openChatGPT}
                    className="w-full py-3 rounded-xl bg-transparent border border-[#E05A1E]/40 text-[#E05A1E] hover:bg-[#E05A1E]/10 transition-all text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Generate Thumbnail from ChatGPT
                  </button>
                </div>
              </>
            )}
          </div>
        );
      }

      case 'multipost': {
        const mp = result.multiPostOutput || {};
        const copyMp = async (text: string, key: string) => {
          await navigator.clipboard.writeText(text);
          setMpCopiedKey(key);
          setTimeout(() => setMpCopiedKey(null), 2000);
        };
        const copyChip = (text: string, key: string) => {
          if (isFreePlan) {
            return (
              <span className="text-xs text-gray-500 dark:text-[#888888] italic flex-shrink-0">
                Copy not available on Free Plan
              </span>
            );
          }
          return (
            <button
              type="button"
              onClick={() => copyMp(text, key)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border transition-all ${
                mpCopiedKey === key
                  ? 'border-[#10B981]/50 bg-[#10B981]/10 text-[#10B981]'
                  : 'border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#0D0D0D] text-gray-500 dark:text-[#888888] hover:text-gray-900 dark:hover:text-white hover:border-[#E05A1E]/60'
              }`}
            >
              {mpCopiedKey === key ? (
                <><Check className="w-3.5 h-3.5" />Copied</>
              ) : (
                <><Copy className="w-3.5 h-3.5" />Copy</>
              )}
            </button>
          );
        };

        return (
          <div className="space-y-6">
            {mp.x && mp.x.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-col gap-4">
                  {mp.x.map((tweet, i) => (
                    <div key={i} className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-2xl p-6 relative">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Tweet Option {i + 1}</h4>
                        {copyChip(tweet, `x-${i}`)}
                      </div>
                      <p className="text-gray-700 dark:text-[#CFCFCF] text-sm leading-relaxed">{tweet}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleGenerateMore('x')}
                  disabled={loadingMore === 'x'}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-4 border border-gray-200 dark:border-[#2A2A2A] hover:border-[#4A4A4A] rounded-xl text-gray-500 dark:text-[#888888] hover:text-white transition-all disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-[#E05A1E]" />
                  {loadingMore === 'x' ? 'Generating...' : 'Generate another option'}
                </button>
              </div>
            )}

            {mp.instagram && mp.instagram.length > 0 && (
              <div className="space-y-4">
                {(Array.isArray(mp.instagram) ? mp.instagram : [mp.instagram]).map((caption, i) => (
                  <div key={i} className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Instagram Caption {i + 1}</h4>
                      {copyChip(caption, `instagram-${i}`)}
                    </div>
                    <p className="text-gray-700 dark:text-[#CFCFCF] text-sm leading-relaxed whitespace-pre-wrap">{caption}</p>
                  </div>
                ))}
                <button
                  onClick={() => handleGenerateMore('instagram')}
                  disabled={loadingMore === 'instagram'}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-4 border border-gray-200 dark:border-[#2A2A2A] hover:border-[#4A4A4A] rounded-xl text-gray-500 dark:text-[#888888] hover:text-white transition-all disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-[#E05A1E]" />
                  {loadingMore === 'instagram' ? 'Generating...' : 'Generate another option'}
                </button>
              </div>
            )}

            {mp.linkedin && mp.linkedin.length > 0 && (
              <div className="space-y-4">
                {(Array.isArray(mp.linkedin) ? mp.linkedin : [mp.linkedin]).map((post, i) => (
                  <div key={i} className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">LinkedIn Post {i + 1}</h4>
                      {copyChip(post, `linkedin-${i}`)}
                    </div>
                    <p className="text-gray-700 dark:text-[#CFCFCF] text-sm leading-relaxed whitespace-pre-wrap">{post}</p>
                  </div>
                ))}
                <button
                  onClick={() => handleGenerateMore('linkedin')}
                  disabled={loadingMore === 'linkedin'}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-4 border border-gray-200 dark:border-[#2A2A2A] hover:border-[#4A4A4A] rounded-xl text-gray-500 dark:text-[#888888] hover:text-white transition-all disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-[#E05A1E]" />
                  {loadingMore === 'linkedin' ? 'Generating...' : 'Generate another option'}
                </button>
              </div>
            )}

            {mp.youtube && mp.youtube.length > 0 && (
              <div className="space-y-4">
                {(Array.isArray(mp.youtube) ? mp.youtube : [mp.youtube]).map((post, i) => (
                  <div key={i} className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">YouTube Post {i + 1}</h4>
                      {copyChip(post, `youtube-${i}`)}
                    </div>
                    <p className="text-gray-700 dark:text-[#CFCFCF] text-sm leading-relaxed whitespace-pre-wrap">{post}</p>
                  </div>
                ))}
                <button
                  onClick={() => handleGenerateMore('youtube')}
                  disabled={loadingMore === 'youtube'}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-4 border border-gray-200 dark:border-[#2A2A2A] hover:border-[#4A4A4A] rounded-xl text-gray-500 dark:text-[#888888] hover:text-white transition-all disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-[#E05A1E]" />
                  {loadingMore === 'youtube' ? 'Generating...' : 'Generate another option'}
                </button>
              </div>
            )}

            {!mp.x?.length && !mp.instagram?.length && !mp.linkedin?.length && !mp.youtube?.length && (
              <div className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-2xl p-6 text-center text-sm text-gray-500 dark:text-[#888888]">
                MultiPost is generating in the background…
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-6">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-[#E05A1E] text-white shadow-[0_0_18px_rgba(224,90,30,0.3)]"
                : "bg-transparent border border-gray-200 dark:border-[#2A2A2A] text-gray-500 dark:text-[#888888] hover:text-white hover:border-[#E05A1E]/60"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderContent()}
    </div>
  );
}
