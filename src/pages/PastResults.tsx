import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  deleteDoc,
  doc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { PageContainer } from '../components/layout/PageContainer';
import { type Result } from '../types';
import { Spinner } from '../components/ui/Spinner';
import { ResultTabs } from '../components/results/ResultTabs';
import {
  ChevronDown,
  ChevronRight,
  FileAudio,
  FileText,
  Image,
  Clock,
  Trash2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { useT } from '../i18n';

function fileIcon(fileType?: string) {
  if (!fileType) return <FileAudio className="w-4 h-4 text-[#E05A1E] flex-shrink-0" />;
  if (fileType === 'application/pdf') return <FileText className="w-4 h-4 text-[#E05A1E] flex-shrink-0" />;
  if (fileType.startsWith('image/')) return <Image className="w-4 h-4 text-[#E05A1E] flex-shrink-0" />;
  return <FileAudio className="w-4 h-4 text-[#E05A1E] flex-shrink-0" />;
}

async function deleteResultItem(uid: string, result: Result) {
  if (result.id) {
    await deleteDoc(doc(db, `users/${uid}/results/${result.id}`));
  }
  if (result.audioStoragePath) {
    try {
      await deleteObject(ref(storage, result.audioStoragePath));
    } catch {
      // File may already be gone — ignore
    }
  }
}

export function PastResults() {
  const { user } = useAuth();
  const { toast } = useToast();
  const t = useT();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Delete section state
  const [deleteRange, setDeleteRange] = useState<'lastHour' | 'allTime'>('lastHour');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Per-item selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSelectionConfirm, setShowSelectionConfirm] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  // Single item trash confirm
  const [trashConfirmId, setTrashConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const q = query(
      collection(db, `users/${user.uid}/results`),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Result));
        setResults(fetched);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to fetch results', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user?.uid]);

  // ── Delete range (Last Hour / All Time) ──────────────────────────────────
  const handleDeleteRange = async () => {
    if (!user) return;
    setDeleteLoading(true);
    try {
      let toDelete: Result[] = [];

      if (deleteRange === 'lastHour') {
        const cutoff = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
        const q = query(
          collection(db, `users/${user.uid}/results`),
          where('createdAt', '>=', cutoff)
        );
        const snap = await getDocs(q);
        toDelete = snap.docs.map(d => ({ id: d.id, ...d.data() } as Result));
      } else {
        const q = query(collection(db, `users/${user.uid}/results`));
        const snap = await getDocs(q);
        toDelete = snap.docs.map(d => ({ id: d.id, ...d.data() } as Result));
      }

      await Promise.all(toDelete.map(r => deleteResultItem(user.uid, r)));
      toast(t('history.deletedToast'), 'success');
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Delete failed', err);
      toast(t('history.deleteFailedToast'), 'error');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // ── Single item delete ───────────────────────────────────────────────────
  const handleTrashConfirm = async () => {
    if (!user || !trashConfirmId) return;
    const target = results.find(r => r.id === trashConfirmId);
    if (!target) { setTrashConfirmId(null); return; }
    setRemovingIds(prev => new Set(prev).add(trashConfirmId));
    setTrashConfirmId(null);
    await deleteResultItem(user.uid, target);
    toast(t('history.itemDeletedToast'), 'success');
    // onSnapshot removes the item from results automatically
    setRemovingIds(prev => { const s = new Set(prev); s.delete(target.id!); return s; });
  };

  // ── Delete selected ──────────────────────────────────────────────────────
  const handleDeleteSelected = async () => {
    if (!user) return;
    setShowSelectionConfirm(false);
    const toDelete = results.filter(r => r.id && selectedIds.has(r.id));
    const ids = toDelete.map(r => r.id!);
    ids.forEach(id => setRemovingIds(prev => new Set(prev).add(id)));
    await Promise.all(toDelete.map(r => deleteResultItem(user.uid, r)));
    // onSnapshot removes deleted items from results automatically
    setRemovingIds(new Set());
    setSelectedIds(new Set());
    toast(t('history.deletedToast'), 'success');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const rangeLabel = deleteRange === 'lastHour' ? t('history.lastHour') : t('history.allTime');

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto">
        {/* ── Heading ── */}
        <h1 className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-wide mb-2">
          {t('history.title')}
        </h1>

        {/* ── Static info text ── */}
        <div className="flex flex-col items-center gap-1 mb-6 text-center">
          <p className="text-xs text-gray-500 dark:text-[#888888] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#E05A1E]" />
            {t('history.autoDelete')}
          </p>
          <p className="text-xs text-gray-500 dark:text-[#888888]">
            {t('history.manualDelete')}
          </p>
        </div>

        {/* ── DELETE BROWSING DATA section ── */}
        <div className="bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-2xl p-5 mb-6">
          <p className="text-white text-lg font-bold mb-4">{t('history.deleteSectionTitle')}</p>

          {/* Pill buttons */}
          <div className="flex gap-3 mb-4">
            {(['lastHour', 'allTime'] as const).map((range) => {
              const label = range === 'lastHour' ? t('history.lastHour') : t('history.allTime');
              const active = deleteRange === range;
              return (
                <button
                  key={range}
                  onClick={() => setDeleteRange(range)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
                    active
                      ? "bg-[#EF4444] text-white border-[#EF4444]"
                      : "bg-transparent border-gray-200 dark:border-[#2A2A2A] text-gray-500 dark:text-[#888888] hover:text-white"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteLoading}
            className="w-full py-2.5 rounded-lg bg-[#EF4444] text-white text-sm font-semibold hover:bg-[#DC2626] transition-colors disabled:opacity-60"
          >
            {deleteLoading ? t('history.deleting') : t('history.deleteBtn')}
          </button>
        </div>

        {/* ── Delete range confirmation dialog ── */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-2xl p-6 max-w-sm w-full mx-4">
              <p className="text-white font-semibold mb-2">{t('history.confirmRangeTitle', { range: rangeLabel })}</p>
              <p className="text-sm text-gray-500 dark:text-[#888888] mb-6">
                {t('history.confirmRangeDesc', { range: rangeLabel })}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-[#2A2A2A] text-gray-500 dark:text-[#888888] hover:text-white text-sm transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDeleteRange}
                  className="flex-1 py-2 rounded-lg bg-[#EF4444] text-white text-sm font-semibold hover:bg-[#DC2626] transition-colors"
                >
                  {t('common.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Single item trash confirmation dialog ── */}
        {trashConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-2xl p-6 max-w-sm w-full mx-4">
              <p className="text-white font-semibold mb-2">{t('history.confirmItemTitle')}</p>
              <p className="text-sm text-gray-500 dark:text-[#888888] mb-6">{t('history.confirmItemDesc')}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setTrashConfirmId(null)}
                  className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-[#2A2A2A] text-gray-500 dark:text-[#888888] hover:text-white text-sm transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleTrashConfirm}
                  className="flex-1 py-2 rounded-lg bg-[#EF4444] text-white text-sm font-semibold hover:bg-[#DC2626] transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete selected confirmation dialog ── */}
        {showSelectionConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-2xl p-6 max-w-sm w-full mx-4">
              <p className="text-white font-semibold mb-2">{t('history.confirmSelectedTitle', { count: selectedIds.size })}</p>
              <p className="text-sm text-gray-500 dark:text-[#888888] mb-6">{t('history.confirmSelectedDesc')}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSelectionConfirm(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-[#2A2A2A] text-gray-500 dark:text-[#888888] hover:text-white text-sm transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="flex-1 py-2 rounded-lg bg-[#EF4444] text-white text-sm font-semibold hover:bg-[#DC2626] transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Results list ── */}
        {loading ? (
          <div className="py-20 text-center">
            <Spinner text={t('history.loadingHistory')} />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-2xl">
            <p className="text-gray-500 dark:text-[#888888]">{t('history.empty')}</p>
          </div>
        ) : (
          <>
            {/* Delete Selected button — appears when items checked */}
            {selectedIds.size > 0 && (
              <div className="mb-3 flex gap-3">
                <button
                  onClick={() => setShowSelectionConfirm(true)}
                  className="px-4 py-2 rounded-lg bg-[#EF4444] text-white text-sm font-semibold hover:bg-[#DC2626] transition-colors"
                >
                  {t('history.deleteSelected', { count: selectedIds.size })}
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-[#2A2A2A] text-gray-500 dark:text-[#888888] hover:text-white text-sm transition-colors"
                >
                  {t('history.clearSelection')}
                </button>
              </div>
            )}

            <div className="space-y-3">
              {results.map((result) => {
                const isExpanded = expandedId === result.id;
                const isRemoving = result.id ? removingIds.has(result.id) : false;
                const isSelected = result.id ? selectedIds.has(result.id) : false;

                const date = result.createdAt
                  ? new Date((result.createdAt as any).seconds * 1000).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '';
                const time = result.createdAt
                  ? new Date((result.createdAt as any).seconds * 1000).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : t('history.justNow');

                return (
                  <div
                    key={result.id}
                    className={cn(
                      "border border-gray-200 dark:border-[#2A2A2A] rounded-2xl bg-gray-50 dark:bg-[#1A1A1A] overflow-hidden transition-all duration-400",
                      isRemoving && "opacity-0 scale-95"
                    )}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => result.id && toggleSelect(result.id)}
                        className="w-4 h-4 accent-[#EF4444] flex-shrink-0 cursor-pointer"
                      />

                      {/* Expand toggle — takes remaining space */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : (result.id || null))}
                        className="flex-1 flex items-center gap-3 text-left min-w-0 hover:opacity-80 transition-opacity"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-[#888888] flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500 dark:text-[#888888] flex-shrink-0" />
                        )}

                        {fileIcon(result.fileType)}

                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white text-sm truncate max-w-[160px] sm:max-w-md">
                            {result.audioFileName}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-[#555555]">{date} {time}</p>
                        </div>

                        <span className={cn(
                          "text-[10px] sm:text-xs px-2 py-1 rounded-full font-medium flex-shrink-0",
                          result.status === 'complete' ? "bg-[#10B981]/10 text-[#10B981]" :
                          result.status === 'failed' ? "bg-[#EF4444]/10 text-[#EF4444]" :
                          "bg-[#E05A1E]/10 text-[#E05A1E]"
                        )}>
                          {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                        </span>
                      </button>

                      {/* Trash icon */}
                      <button
                        onClick={() => result.id && setTrashConfirmId(result.id)}
                        className="flex-shrink-0 p-1.5 text-gray-400 dark:text-[#555555] hover:text-[#EF4444] transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#0D0D0D]/40">
                        {result.status === 'complete' ? (
                          <ResultTabs result={result} />
                        ) : result.status === 'failed' ? (
                          <p className="text-[#EF4444] text-sm">{result.errorMessage || t('history.processingFailed')}</p>
                        ) : (
                          <p className="text-gray-500 dark:text-[#888888] text-sm">{t('history.processingInProgress')}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
