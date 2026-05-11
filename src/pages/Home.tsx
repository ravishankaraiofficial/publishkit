import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUpload } from '../hooks/useUpload';
import { PageContainer } from '../components/layout/PageContainer';
import { DropZone } from '../components/upload/DropZone';
import { ResultTabs } from '../components/results/ResultTabs';
import { cn } from '../lib/utils';

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    isUploading,
    uploadProgress,
    statusIndex,
    statusCycle,
    outputLanguage,
    setOutputLanguage,
    thumbnailPromptEnabled,
    setThumbnailPromptEnabled,
    result,
    quotaExceeded,
    handleFileSelect,
    reset
  } = useUpload();

  const isGuest = !!user?.isAnonymous;

  const showResults = !!(result && result.status === 'complete');
  const showProcessing =
    (isUploading && !showResults) ||
    !!(result && result.status === 'processing');
  const showUpload = !isUploading && !showResults && !showProcessing;

  return (
    <PageContainer>
      {/* Hero */}
      <section className="text-center pt-6 sm:pt-10 pb-5 sm:pb-8">
        <h1 className="hero-glow text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          PublishKit
        </h1>
        <p className="hero-glow mt-3 sm:mt-6 text-[#E05A1E] text-base sm:text-2xl max-w-3xl mx-auto font-medium px-2">
          Turn your audio into YouTube-ready Titles, Timestamps &amp; Descriptions in 90 seconds.
        </p>
      </section>

      {/* Language and Options Toggles */}
      <div className="flex flex-col items-center gap-3 mb-6 sm:mb-10">
        {/* Language buttons */}
        <div className="flex justify-center gap-2">
          {(["English", "Hindi"] as const).map((lang) => {
            const active = outputLanguage === lang;
            return (
              <button
                key={lang}
                type="button"
                onClick={() => setOutputLanguage(lang)}
                disabled={isUploading || showResults}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium transition-all",
                  active
                    ? "bg-[#E05A1E] text-white shadow-[0_0_18px_rgba(224,90,30,0.35)]"
                    : "bg-transparent border border-[#2A2A2A] text-[#888888] hover:text-white hover:border-[#E05A1E]/60",
                  (isUploading || showResults) && "opacity-60 cursor-not-allowed"
                )}
              >
                {lang}
              </button>
            );
          })}
        </div>

        {/* Thumbnail Toggle — compact on mobile, full width like free-session box on desktop */}
        <label className="flex items-center gap-3 cursor-pointer group bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-2.5 w-full max-w-sm sm:max-w-[600px] sm:justify-center sm:py-3 transition-all hover:border-[#E05A1E]/40">
          <div className="relative flex-shrink-0">
            <input
              type="checkbox"
              className="sr-only"
              checked={thumbnailPromptEnabled}
              onChange={(e) => setThumbnailPromptEnabled(e.target.checked)}
              disabled={isUploading || showResults}
            />
            <div className={cn(
              "block w-10 h-[22px] rounded-full transition-colors",
              thumbnailPromptEnabled ? "bg-[#E05A1E]" : "bg-[#2A2A2A]"
            )}></div>
            <div className={cn(
              "dot absolute left-[3px] top-[3px] bg-white w-4 h-4 rounded-full transition-transform",
              thumbnailPromptEnabled ? "transform translate-x-[18px]" : ""
            )}></div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="text-xs font-semibold text-white leading-tight sm:text-sm">Thumbnail Prompts</span>
            <span className="text-[10px] text-[#555555] leading-tight sm:text-sm sm:text-[#888888]">
              <span className="hidden sm:inline">— </span>Off by default · uses extra AI
              <span className="hidden sm:inline"> · Audio files only</span>
            </span>
            <span className="text-[10px] text-[#444444] leading-tight mt-0.5 sm:hidden">Audio files only</span>
          </div>
        </label>
      </div>

      {/* Free trial notice for anonymous visitors */}
      {isGuest && (
        <div className="max-w-[600px] mx-auto mb-4 fade-in">
          <div className="flex items-center gap-2 justify-center bg-[#1A1A1A] border border-[#E05A1E]/30 rounded-xl px-4 py-3 text-sm text-center">
            <span className="text-[#E05A1E]">✦</span>
            <span className="text-[#CFCFCF]">
              <span className="text-white font-semibold">1 free session</span> — no sign-in needed.
              Sign in after to keep using PublishKit.
            </span>
          </div>
        </div>
      )}

      {/* Body — upload OR processing OR results */}
      <div className="max-w-[600px] mx-auto">
        {/* Guest quota exhausted — prompt sign-in instead of upload zone */}
        {quotaExceeded && (
          <div className="fade-in bg-[#1A1A1A] border border-[#E05A1E]/40 rounded-2xl px-6 py-8 text-center">
            <p className="text-white font-semibold text-lg mb-2">Your free session is complete! 🎉</p>
            <p className="text-[#888888] text-sm mb-6 leading-relaxed">
              You've used your one free session. Sign in with Google to keep
              using PublishKit — it's completely free.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full max-w-xs mx-auto rounded-xl bg-[#E05A1E] hover:bg-[#FF7A3D] text-white font-semibold text-sm py-3 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="white"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="white" fillOpacity=".85"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="white" fillOpacity=".7"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="white" fillOpacity=".6"/>
              </svg>
              Sign in with Google
            </button>
          </div>
        )}

        {!quotaExceeded && showUpload && (
          <div className="fade-in">
            <DropZone onFileSelect={handleFileSelect} />
          </div>
        )}

        {showProcessing && (
          <div className="flex flex-col gap-4">
            <ProcessingCard
              statusText={statusCycle[statusIndex]}
              uploadProgress={uploadProgress}
            />
            {result?.status === 'failed' && (
              <button
                onClick={reset}
                className="w-full py-2.5 rounded-xl border border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444]/10 transition-all text-sm font-medium"
              >
                Failed. Try Another File?
              </button>
            )}
          </div>
        )}
      </div>

      {showResults && result && (
        <div className="max-w-4xl mx-auto fade-in mt-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
            <h2 className="text-xl font-semibold text-white truncate">
              Results for <span className="text-[#888888]">{result.audioFileName}</span>
            </h2>
          </div>

          <ResultTabs result={result} />

          <div className="text-center mt-8">
            {isGuest ? (
              /* Guest: trial just consumed — prompt to sign in */
              <div className="bg-[#1A1A1A] border border-[#E05A1E]/40 rounded-2xl px-6 py-6 max-w-sm mx-auto fade-in">
                <p className="text-white font-semibold mb-1">That was your free session! 🎉</p>
                <p className="text-[#888888] text-sm mb-5 leading-relaxed">
                  Sign in with Google to generate again — it's completely free.
                </p>
                {/* History link ABOVE the sign-in button */}
                <Link
                  to="/results"
                  className="flex items-center justify-center gap-2 w-full mb-3 py-2.5 rounded-xl border border-[#2A2A2A] hover:border-[#E05A1E]/60 text-[#CFCFCF] hover:text-white text-sm font-medium transition-all"
                >
                  <svg className="w-4 h-4 text-[#E05A1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View uploaded files in History
                </Link>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full rounded-xl bg-[#E05A1E] hover:bg-[#FF7A3D] text-white font-semibold text-sm py-3 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="white"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="white" fillOpacity=".85"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="white" fillOpacity=".7"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="white" fillOpacity=".6"/>
                  </svg>
                  Sign in with Google
                </button>
              </div>
            ) : (
              <button
                onClick={reset}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-[#E05A1E]/60 text-[#E05A1E] hover:bg-[#E05A1E]/10 hover:border-[#E05A1E] transition-all text-sm font-medium"
              >
                Generate Another
              </button>
            )}
          </div>
        </div>
      )}

      {/* Inline History Footer Tab */}
      <div className="mt-12 mb-8 flex justify-center w-full">
        <Link
          to="/results"
          className="flex items-center gap-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#E05A1E]/60 text-[#CFCFCF] hover:text-white px-6 py-3.5 rounded-2xl text-sm font-medium transition-all shadow-lg hover:shadow-[0_0_20px_rgba(224,90,30,0.15)] w-full max-w-md justify-center"
        >
          <svg className="w-4 h-4 text-[#E05A1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          View processing and uploaded files in History
        </Link>
      </div>

    </PageContainer>
  );
}

function ProcessingCard({
  statusText,
  uploadProgress,
}: {
  statusText: string;
  uploadProgress: number;
}) {
  return (
    <div
      className="fade-in-fast w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-10 flex flex-col items-center"
      style={{ minHeight: 288 }}
    >
      <div
        className="eq-bars"
        style={{ filter: "drop-shadow(0 0 30px rgba(224,90,30,0.2))" }}
        aria-hidden="true"
      >
        <span /><span /><span /><span /><span />
      </div>

      <p
        key={statusText}
        className="status-text mt-8 text-[#F5F5F5] text-base"
      >
        {statusText}
      </p>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="w-full max-w-xs mt-6">
          <div className="h-1 w-full bg-[#2A2A2A] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E05A1E] transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-[#555555] text-center mt-2">
            {Math.round(uploadProgress)}%
          </p>
        </div>
      )}
    </div>
  );
}
