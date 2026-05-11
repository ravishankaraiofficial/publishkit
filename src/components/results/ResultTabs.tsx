import { useState } from 'react';
import { type Result } from '../../types';
import { cn } from '../../lib/utils';
import { CopyButton } from './CopyButton';
import { useAuth } from '../../hooks/useAuth';

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
  const { user, signInWithGoogle } = useAuth();

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
                  : "bg-transparent border border-[#2A2A2A] text-[#888888] hover:text-white hover:border-[#E05A1E]/60"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'summary' && (
          <div className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 pt-14">
            <CopyButton text={result.summary || ''} />
            <pre className="whitespace-pre-wrap font-sans text-[#CFCFCF] leading-relaxed text-sm">
              {result.summary || ''}
            </pre>
          </div>
        )}

        {activeTab === 'description' && (
          <div className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 pt-14">
            <CopyButton text={result.description || ''} />
            <pre className="whitespace-pre-wrap font-sans text-[#CFCFCF] leading-relaxed text-sm">
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
  if (result.thumbnailPromptImagen) {
    visibleTabs.push({ id: 'thumbnails', label: 'Thumbnail Prompts' });
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'titles': {
        const titlesText = (result.titles || [])
          .map((t, i) => `${i + 1}. ${t.title}\n${t.reason}`)
          .join('\n\n');
        return (
          <div className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 pt-14">
            <CopyButton text={titlesText} />
            <div className="space-y-6">
              {(result.titles || []).map((t, i) => (
                <div key={i} className="border-b border-[#2A2A2A] pb-4 last:border-0 last:pb-0">
                  <h4 className="text-base font-medium text-white mb-1">
                    {i + 1}. {t.title}
                  </h4>
                  <p className="text-sm text-[#888888] italic">{t.reason}</p>
                </div>
              ))}
            </div>
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
          <div className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 pt-14 space-y-10">
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
                <pre className="whitespace-pre-wrap font-sans text-[#CFCFCF] leading-relaxed text-sm bg-[#0D0D0D]/30 p-4 rounded-xl border border-[#2A2A2A]/50 shadow-inner">
                  {chapter.items.join('\n')}
                </pre>
              </div>
            ))}
          </div>
        );
      }

      case 'description':
        return (
          <div className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 pt-14">
            <CopyButton text={result.description || ''} />
            <pre className="whitespace-pre-wrap font-sans text-[#CFCFCF] leading-relaxed text-sm">
              {result.description}
            </pre>
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

        const copyAndNotifyImagen = async () => {
          if (user?.isAnonymous) {
            await signInWithGoogle();
            return;
          }
          if (!result.thumbnailPromptImagen) return;
          navigator.clipboard.writeText(result.thumbnailPromptImagen);
          alert('Prompt copied! Use this prompt in Google Imagen 3 to generate your thumbnail.');
        };

        return (
          <div className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 pt-14 space-y-8">
            <CopyButton text={thumbText} />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-white">Google Imagen 3 Prompt</h4>
                <span className="text-[10px] bg-[#E05A1E]/10 text-[#E05A1E] px-2 py-0.5 rounded-full border border-[#E05A1E]/20">Best for Realism</span>
              </div>
              <p className="text-[#CFCFCF] bg-[#0D0D0D] p-4 rounded-xl border border-[#2A2A2A] text-sm leading-relaxed shadow-inner">
                {result.thumbnailPromptImagen}
              </p>
              <button 
                onClick={copyAndNotifyImagen}
                className="w-full py-3 rounded-xl bg-transparent border border-[#E05A1E]/40 text-[#E05A1E] hover:bg-[#E05A1E]/10 transition-all text-sm font-semibold flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Generate Thumbnail from Imagen
              </button>
            </div>

            <div className="space-y-4 pt-4 border-t border-[#2A2A2A]">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-white">ChatGPT / DALL-E 3 Prompt</h4>
                <span className="text-[10px] bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded-full border border-[#10B981]/20">Best for Bold Graphics</span>
              </div>
              <p className="text-[#CFCFCF] bg-[#0D0D0D] p-4 rounded-xl border border-[#2A2A2A] text-sm leading-relaxed shadow-inner">
                {result.thumbnailPromptChatGPT}
              </p>
              <button 
                onClick={openChatGPT}
                className="w-full py-3 rounded-xl bg-[#E05A1E] text-white hover:bg-[#FF7A3D] transition-all text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#E05A1E]/10"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.28 12.12c0-1.8-.73-3.48-1.92-4.71-1.19-1.23-2.82-1.99-4.63-1.99-1.39 0-3.47.45-5.18 1.48-1.71-1.03-3.79-1.48-5.18-1.48-1.81 0-3.44.76-4.63 1.99-1.19 1.23-1.92 2.91-1.92 4.71 0 1.25.36 2.41 1 3.39L1.41 21.3a.75.75 0 0 0 .9.9l5.79-1.44c.98.64 2.14 1 3.39 1 1.81 0 3.44-.76 4.63-1.99 1.19-1.23 1.92-2.91 1.92-4.71 0-.3-.02-.59-.06-.88.66-.59 1.22-1.31 1.63-2.12.41-.81.67-1.71.67-2.65V12.12zM12 19c-1.38 0-2.61-.43-3.64-1.15a.75.75 0 0 0-.67-.09l-4.11 1.02 1.02-4.11a.75.75 0 0 0-.09-.67C3.79 13.16 3.36 11.93 3.36 10.55c0-1.28.53-2.48 1.49-3.36C5.81 6.3 7.01 5.77 8.29 5.77c.88 0 2.22.24 3.71.95V10.5c0 .35.05.7.15 1.03.1.33.25.64.45.92.2.28.45.52.74.72s.6.35.94.45c.34.1.69.15 1.04.15h.68l.21 2.54c-.16.2-.33.39-.53.56-1.19 1.23-2.82 1.99-4.63 1.99-1.39 0-3.47-.45-5.18-1.48a.75.75 0 0 0-.84.04c-.33.24-.71.39-1.12.45-.41.06-.83.02-1.23-.11-.4-.13-.76-.35-1.07-.63-.31-.28-.54-.62-.68-1s-.2-.79-.17-1.19c.03-.4.16-.78.38-1.12s.51-.62.86-.81c.35-.19.74-.29 1.14-.29.41 0 .8.1 1.14.29l1.45.87V7.05c1.49-.71 2.83-.95 3.71-.95 1.28 0 2.48.53 3.36 1.49.96.88 1.49 2.08 1.49 3.36 0 .67-.2 1.3-.57 1.83l-1.04-.62c.2-.28.31-.62.31-.97 0-.46-.18-.88-.47-1.2-.29-.32-.69-.53-1.12-.53-1.1 0-2 1.12-2 2.5V19z" />
                </svg>
                Generate Thumbnail from ChatGPT
              </button>
            </div>
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
                : "bg-transparent border border-[#2A2A2A] text-[#888888] hover:text-white hover:border-[#E05A1E]/60"
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
