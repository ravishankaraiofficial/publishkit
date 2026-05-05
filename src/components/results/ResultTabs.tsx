import { useState } from 'react';
import { type Result } from '../../types';
import { cn } from '../../lib/utils';
import { CopyButton } from './CopyButton';

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

      case 'timestamps':
        return (
          <div className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 pt-14">
            <CopyButton text={result.timestamps || ''} />
            <pre className="whitespace-pre-wrap font-sans text-[#CFCFCF] leading-relaxed text-sm">
              {result.timestamps}
            </pre>
          </div>
        );

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
        const thumbText = `IMAGEN PROMPT:\n${result.thumbnailPromptImagen}\n\nCHATGPT/DALL-E PROMPT:\n${result.thumbnailPromptChatGPT}`;
        return (
          <div className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 pt-14 space-y-6">
            <CopyButton text={thumbText} />
            <div>
              <h4 className="section-label mb-2">Imagen Prompt</h4>
              <p className="text-[#CFCFCF] bg-[#0D0D0D] p-4 rounded-lg border border-[#2A2A2A] text-sm leading-relaxed">
                {result.thumbnailPromptImagen}
              </p>
            </div>
            <div>
              <h4 className="section-label mb-2">ChatGPT / DALL-E Prompt</h4>
              <p className="text-[#CFCFCF] bg-[#0D0D0D] p-4 rounded-lg border border-[#2A2A2A] text-sm leading-relaxed">
                {result.thumbnailPromptChatGPT}
              </p>
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
