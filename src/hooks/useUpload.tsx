import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, storage, functions } from '../lib/firebase';
import { useAuth } from './useAuth';
import { useToast } from '../components/ui/Toast';
import { processAudioCall } from '../lib/api';
import { type Result } from '../types';
import type { OutputLanguage } from '../lib/languages';
import fpPromise from '@fingerprintjs/fingerprintjs';

interface MultiPostPlatforms {
  x: boolean;
  instagram: boolean;
  linkedin: boolean;
  youtube: boolean;
}

interface PendingUpload {
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  outputLanguage: OutputLanguage;
  thumbnailPromptEnabled: boolean;
  generationMode?: 'metadata' | 'script';
  scriptTone?: string;
  scriptDuration?: string;
}

function getStatusCycle(fileType: string): string[] {
  if (fileType.startsWith('audio/')) {
    return [
      "Uploading audio…",
      "Transcribing your voice…",
      "Generating titles…",
      "Writing description…",
      "Almost ready…",
    ];
  }
  if (fileType === 'application/pdf') {
    return [
      "Uploading PDF…",
      "Reading and decoding the document…",
      "Extracting key content…",
      "Generating titles…",
      "Writing description…",
      "Almost ready…",
    ];
  }
  if (fileType.startsWith('image/')) {
    return [
      "Uploading image…",
      "Decoding the file…",
      "Analysing visual content…",
      "Generating titles…",
      "Writing description…",
      "Almost ready…",
    ];
  }
  return [
    "Uploading file…",
    "Decoding the file…",
    "Analysing content…",
    "Generating titles…",
    "Writing description…",
    "Almost ready…",
  ];
}

interface UploadContextType {
  isUploading: boolean;
  uploadProgress: number;
  statusIndex: number;
  statusCycle: string[];
  outputLanguage: OutputLanguage;
  setOutputLanguage: (lang: OutputLanguage) => void;
  thumbnailPromptEnabled: boolean;
  setThumbnailPromptEnabled: (enabled: boolean) => void;
  multiPostEnabled: boolean;
  setMultiPostEnabled: (enabled: boolean) => void;
  multiPostPlatforms: MultiPostPlatforms;
  setMultiPostPlatforms: (platforms: MultiPostPlatforms) => void;
  resultId: string | null;
  setResultId: (id: string | null) => void;
  result: Result | null;
  setResult: (res: Result | null) => void;
  quotaExceeded: boolean;
  setQuotaExceeded: (exceeded: boolean) => void;
  uploadMode: 'metadata' | 'script';
  setUploadMode: (mode: 'metadata' | 'script') => void;
  scriptTone: string;
  setScriptTone: (tone: string) => void;
  scriptDuration: string;
  setScriptDuration: (duration: string) => void;
  handleFileSelect: (file: File) => Promise<void>;
  reset: () => void;
}

const UploadContext = createContext<UploadContextType | null>(null);

export function UploadProvider({ children }: { children: ReactNode }) {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [statusCycle, setStatusCycle] = useState<string[]>(getStatusCycle('audio/mpeg'));
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("English");
  const [uploadMode, setUploadMode] = useState<'metadata' | 'script'>('metadata');
  const [scriptTone, setScriptTone] = useState<string>('Casual');
  const [scriptDuration, setScriptDuration] = useState<string>('10');
  const [thumbnailPromptEnabled, setThumbnailPromptEnabled] = useState(false);
  const [multiPostEnabled, setMultiPostEnabled] = useState(false);
  const [multiPostPlatforms, setMultiPostPlatforms] = useState<MultiPostPlatforms>({
    x: true,
    instagram: true,
    linkedin: true,
    youtube: true,
  });
  // Track whether MultiPost has been triggered for the current result so we
  // don't re-run it on every onSnapshot tick after the result completes.
  const multiPostTriggeredRef = useRef<string | null>(null);
  
  const [resultId, setResultId] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(() => localStorage.getItem('freeTrialUsed') === 'true');
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);

  const statusTimerRef = useRef<number | null>(null);
  const prevUidRef = useRef<string | null>(null);
  const recoveryAttemptedRef = useRef(false);

  // When the user changes (e.g., anonymous → Google after sign-in), reset all
  // upload state so the main page shows a fresh upload zone, not the old result.
  useEffect(() => {
    if (!user) return;
    const prevUid = prevUidRef.current;
    prevUidRef.current = user.uid;

    if (prevUid && prevUid !== user.uid) {
      // User identity changed. Check if they just upgraded from guest with a completed result.
      const backup = localStorage.getItem('guestResultBackup');
      if (backup && !user.isAnonymous) {
        try {
          const parsed = JSON.parse(backup) as Result;
          setResult(parsed);
          setResultId('restored-guest-result');
        } catch(e) {}
        localStorage.removeItem('guestResultBackup');
        recoveryAttemptedRef.current = false;
        return;
      }

      // User identity changed — clear everything
      setResult(null);
      setResultId(null);
      setPendingUpload(null);
      setUploadProgress(0);
      setStatusIndex(0);
      setQuotaExceeded(false);
      setIsUploading(false);
      recoveryAttemptedRef.current = false;
      return; // Don't restore old resultId for a new user
    }

    // Restore active resultId from localStorage when user is available
    if (!resultId) {
      const savedId = localStorage.getItem(`activeResultId_${user.uid}`);
      if (savedId) {
        setResultId(savedId);
      } else if (!user.isAnonymous) {
        // No active result. Did they just sign in via redirect after generating as guest?
        const backup = localStorage.getItem('guestResultBackup');
        if (backup) {
          try {
            const parsed = JSON.parse(backup) as Result;
            setResult(parsed);
            setResultId('restored-guest-result');
          } catch(e) {}
          localStorage.removeItem('guestResultBackup');
        }
      }
    }

    // Restore pending upload metadata if no result is active
    if (!resultId && !recoveryAttemptedRef.current) {
      const savedPending = localStorage.getItem(`pendingUpload_${user.uid}`);
      if (savedPending) {
        try {
          const parsed = JSON.parse(savedPending) as PendingUpload;
          setPendingUpload(parsed);
          // If we have a pending upload but no resultId yet, we are in the
          // "blind spot". Show processing UI.
          setStatusCycle(getStatusCycle(parsed.fileType));
          setIsUploading(true);
          recoveryAttemptedRef.current = true;

          // Re-trigger the callable — backend caching makes this safe and idempotent.
          // This recovers from a refresh that happened after upload but before resultId was returned.
          processAudioCall({
            storagePath: parsed.storagePath,
            audioFileName: parsed.fileName,
            audioSizeBytes: parsed.fileSize,
            outputLanguage: parsed.outputLanguage,
            generateThumbnails: parsed.fileType.startsWith('audio/') ? parsed.thumbnailPromptEnabled : false,
            fileType: parsed.fileType,
            generationMode: parsed.generationMode || 'metadata',
            scriptTone: parsed.scriptTone,
            scriptDuration: parsed.scriptDuration,
          }).then(res => {
            setResultId(res.data.resultId);
          }).catch((err) => {
            console.error("Recovery processAudioCall failed:", err);
            // If it was a quota error, handle it
            if (err?.code === 'functions/resource-exhausted') {
              if (user.isAnonymous) {
                localStorage.setItem('freeTrialUsed', 'true');
                setQuotaExceeded(true);
              }
            }
            setIsUploading(false);
          });
        } catch (e) {
          localStorage.removeItem(`pendingUpload_${user.uid}`);
        }
      }
    }
  }, [user?.uid, resultId]);

  // Save active resultId to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      if (resultId) {
        localStorage.setItem(`activeResultId_${user.uid}`, resultId);
        // Once we have a resultId, the "pending" metadata is no longer needed
        localStorage.removeItem(`pendingUpload_${user.uid}`);
        setPendingUpload(null);
      } else {
        localStorage.removeItem(`activeResultId_${user.uid}`);
      }
    }
  }, [user, resultId]);

  // Save pending upload metadata whenever it changes
  useEffect(() => {
    if (user && pendingUpload) {
      localStorage.setItem(`pendingUpload_${user.uid}`, JSON.stringify(pendingUpload));
    }
  }, [user, pendingUpload]);

  // Cycle through status messages every 3 seconds while processing
  useEffect(() => {
    if (!isUploading) {
      if (statusTimerRef.current) {
        window.clearInterval(statusTimerRef.current);
        statusTimerRef.current = null;
      }
      return;
    }

    statusTimerRef.current = window.setInterval(() => {
      setStatusIndex((i) => (i + 1) % statusCycle.length);
    }, 3000);

    return () => {
      if (statusTimerRef.current) {
        window.clearInterval(statusTimerRef.current);
        statusTimerRef.current = null;
      }
    };
  }, [isUploading, statusCycle]);

  // Listen to Firestore for result updates
  useEffect(() => {
    if (!user || !resultId || resultId === 'restored-guest-result') return;

    const unsubscribe = onSnapshot(doc(db, `users/${user.uid}/results/${resultId}`), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Result;
        setResult(data);

        if (data.status === 'complete' || data.status === 'failed') {
          setIsUploading(false);
          setPendingUpload(null);
          if (user) localStorage.removeItem(`pendingUpload_${user.uid}`);

          if (data.status === 'complete' && user?.isAnonymous) {
            // Mark free trial as consumed so next visit gates to login.
            localStorage.setItem('freeTrialUsed', 'true');
            // Backup the result in case they sign in to copy it
            localStorage.setItem('guestResultBackup', JSON.stringify(data));
          }
          if (data.status === 'failed') {
            toast(data.errorMessage || 'Processing failed.', 'error');
          }

          // Auto-trigger MultiPost when the result lands, if the user opted in
          // BEFORE uploading. Guests cannot use MultiPost (quota fields live
          // on the user doc). Skip if already triggered for this resultId or
          // if the result doc already has multiPostOutput.
          if (
            data.status === 'complete' &&
            !user?.isAnonymous &&
            multiPostEnabled &&
            !data.multiPostOutput &&
            multiPostTriggeredRef.current !== resultId
          ) {
            const platforms = (['x', 'instagram', 'linkedin', 'youtube'] as const).filter(
              (p) => multiPostPlatforms[p]
            );
            // Audio results have titles[0].title. PDF / image results have summary
            // instead — use the first 200 chars of summary so MultiPost has
            // meaningful context to generate from. Filename is last-resort.
            const firstTitle =
              data.titles?.[0]?.title ||
              data.summary?.slice(0, 200) ||
              data.audioFileName ||
              '';
            if (platforms.length > 0 && firstTitle) {
              multiPostTriggeredRef.current = resultId;
              const generate = httpsCallable<
                {
                  title: string;
                  description: string;
                  platforms: string[];
                  resultId: string;
                  language: OutputLanguage;
                },
                { x?: string[]; instagram?: string; linkedin?: string }
              >(functions, 'generateRepurposing');
              generate({
                title: firstTitle,
                description: data.description || '',
                platforms: platforms as unknown as string[],
                resultId,
                language: outputLanguage,
              })
                .then(() => refreshProfile())
                .catch((err: any) => {
                console.error('MultiPost auto-generation failed:', err);
                if (err?.code === 'functions/resource-exhausted') {
                  toast('MultiPost monthly limit reached — upgrade your plan to keep using it.', 'error');
                } else {
                  toast(err?.message || 'MultiPost generation failed.', 'error');
                }
              });
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, [user, resultId, toast, multiPostEnabled, multiPostPlatforms, outputLanguage]);

  const handleFileSelect = async (file: File) => {
    if (!user) return;

    // Clear any stale quota/error state from a previous upload attempt
    setQuotaExceeded(false);
    recoveryAttemptedRef.current = false;

    // Set dynamic status messages based on actual file type
    const cycle = getStatusCycle(file.type);
    setStatusCycle(cycle);
    setIsUploading(true);
    setStatusIndex(0);
    setUploadProgress(0);

    // Sanitize filename — strips path traversal segments, slashes, and any
    // characters that aren't alphanumeric / dot / underscore / hyphen. Cap at
    // 100 chars. Defense in depth: Firebase Storage rules already reject paths
    // with extra segments, but normalizing here means a well-behaved path
    // every time and prevents confusing rule-denial errors for legitimate users
    // whose OS allowed weird characters in the original filename.
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const fileName = `${Date.now()}-${safeName}`;
    const isAudio = file.type.startsWith('audio/');
    const folder = isAudio ? 'audio' : 'uploads';
    const storagePath = `users/${user.uid}/${folder}/${fileName}`;

    setPendingUpload({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      storagePath,
      outputLanguage,
      thumbnailPromptEnabled,
      generationMode: uploadMode,
      scriptTone,
      scriptDuration
    });

    const storageRef = ref(storage, storagePath);

    // Always pass explicit metadata so Firebase Storage knows the MIME type
    const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type || 'application/octet-stream' });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload error", error);
        toast('Upload failed. Please try again.', 'error');
        setIsUploading(false);
        setPendingUpload(null);
        localStorage.removeItem(`pendingUpload_${user.uid}`);
      },
      async () => {
        try {
          let visitorId = 'anonymous-fp';
          try {
            const fp = await fpPromise.load();
            const fpResult = await fp.get();
            visitorId = fpResult.visitorId;
          } catch (fpError) {
            console.warn("FingerprintJS blocked or failed to load, falling back to anonymous-fp", fpError);
          }
          
          const isAudio = file.type.startsWith('audio/');
          const res = await processAudioCall({
            storagePath,
            audioFileName: file.name,
            audioSizeBytes: file.size,
            outputLanguage,
            generateThumbnails: isAudio ? thumbnailPromptEnabled : false,
            fileType: file.type,
            fingerprint: visitorId,
            generationMode: uploadMode,
            scriptTone,
            scriptDuration,
          });
          setResultId(res.data.resultId);
        } catch (error: any) {
          console.error("Cloud function error", error);
          if (error?.code === 'functions/resource-exhausted') {
            if (user.isAnonymous) {
              // Guest quota used — show sign-in prompt instead of error toast
              localStorage.setItem('freeTrialUsed', 'true');
              setQuotaExceeded(true);
            } else {
              // Signed-in user hit their daily upload limit — show a toast
              toast('You\'ve reached your upload limit for today. Try again tomorrow.', 'error');
            }
          } else {
            toast(error.message || 'Failed to start processing.', 'error');
          }
          setIsUploading(false);
          setPendingUpload(null);
          localStorage.removeItem(`pendingUpload_${user.uid}`);
        }
      }
    );
  };

  const reset = () => {
    setIsUploading(false);
    setResult(null);
    setResultId(null);
    setPendingUpload(null);
    setUploadProgress(0);
    setStatusIndex(0);
    setQuotaExceeded(false);
    recoveryAttemptedRef.current = false;
    multiPostTriggeredRef.current = null;
    localStorage.removeItem('guestResultBackup');
    if (user) {
      localStorage.removeItem(`activeResultId_${user.uid}`);
      localStorage.removeItem(`pendingUpload_${user.uid}`);
    }
  };

  return (
    <UploadContext.Provider value={{
      isUploading, uploadProgress, statusIndex, statusCycle,
      outputLanguage, setOutputLanguage,
      thumbnailPromptEnabled, setThumbnailPromptEnabled,
      multiPostEnabled, setMultiPostEnabled,
      multiPostPlatforms, setMultiPostPlatforms,
      resultId, setResultId,
      result, setResult,
      quotaExceeded, setQuotaExceeded,
      uploadMode, setUploadMode,
      scriptTone, setScriptTone,
      scriptDuration, setScriptDuration,
      handleFileSelect, reset
    }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
