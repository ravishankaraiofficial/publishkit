export function Spinner({ text, className = '' }: { text?: string, className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E05A1E]"></div>
      {text && <p className="mt-4 text-sm text-[#888888]">{text}</p>}
    </div>
  );
}
