import { useState, useCallback, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '../../lib/utils';


interface DropZoneProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

const MAX_SIZE_MB = 200;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export function DropZone({ onFileSelect, isLoading }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorTimeoutRef = useRef<number | null>(null);

  const validateAndProcessFile = (file: File) => {
    setError(null);
    if (errorTimeoutRef.current) window.clearTimeout(errorTimeoutRef.current);

    if (!file.type.match(/^(audio\/|image\/|application\/pdf)/i) && !file.name.match(/\.(mp3|wav|aac|pdf|png|jpg|jpeg)$/i)) {
      setError('Invalid file type. Please upload Audio, PDF, or Images.');
      errorTimeoutRef.current = window.setTimeout(() => setError(null), 4000);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(`File size exceeds ${MAX_SIZE_MB}MB limit.`);
      errorTimeoutRef.current = window.setTimeout(() => setError(null), 4000);
      return;
    }
    onFileSelect(file);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  }, []);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "w-full h-72 rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all bg-[#1A1A1A]",
          "border-2 border-dashed",
          isDragging
            ? "border-[#E05A1E] shadow-[0_0_20px_rgba(224,90,30,0.25)]"
            : "border-[#2A2A2A] hover:border-[#E05A1E] hover:shadow-[0_0_20px_rgba(224,90,30,0.15)]",
          isLoading && "opacity-50 pointer-events-none"
        )}
      >
        <UploadCloud
          className={cn(
            "w-10 h-10 mb-4 transition-colors",
            isDragging ? "text-[#FF7A3D]" : "text-[#E05A1E]"
          )}
        />
        <p className="text-white text-base font-medium">
          Upload your Audio here (or PDF / Image for analysis)
        </p>
        <p className="mt-2 text-xs text-[#555555] tracking-wide">
          Audio · PDF · Image · Max {MAX_SIZE_MB}MB
        </p>

        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileInputChange}
          accept="audio/*,application/pdf,image/*"
          className="hidden"
        />
      </div>

      {error && (
        <div className="mt-4 px-4 py-2.5 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] rounded-lg text-sm w-full text-center">
          {error}
        </div>
      )}
    </div>
  );
}
