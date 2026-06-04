import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const { user, signInWithGoogle } = useAuth();

  const handleCopy = async () => {
    if (user?.isAnonymous) {
      await signInWithGoogle();
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "absolute top-4 right-4 inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border transition-all",
        copied
          ? "border-[#10B981]/50 bg-[#10B981]/10 text-[#10B981]"
          : "border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#0D0D0D] text-gray-500 dark:text-[#888888] hover:text-gray-900 dark:hover:text-white hover:border-[#E05A1E]/60",
        className
      )}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5" />
          Copied ✓
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          Copy
        </>
      )}
    </button>
  );
}
