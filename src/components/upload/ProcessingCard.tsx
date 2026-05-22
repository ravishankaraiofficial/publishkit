export function ProcessingCard({
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
