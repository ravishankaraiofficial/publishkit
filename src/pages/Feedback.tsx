import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { PageContainer } from '../components/layout/PageContainer';
import { useToast } from '../components/ui/Toast';
import { ArrowBigUp, MessageSquare, Plus, Send } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { useT } from '../i18n';

interface FeedbackReply {
  id: string;
  text: string;
  uid: string;
  userName: string;
  createdAt: any;
}

interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  votes: number;
  votedBy: string[];
  uid: string;
  userName: string;
  status: 'pending' | 'planned' | 'completed';
  createdAt: any;
}

export function Feedback() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const t = useT();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [replies, setReplies] = useState<Record<string, FeedbackReply[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [submittingReply, setSubmittingReply] = useState<Record<string, boolean>>({});
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'feedback'), orderBy('votes', 'desc'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FeedbackItem));
        setItems(fetched);
        setLoading(false);
        fetched.forEach(item => loadReplies(item.id));
      },
      (error) => {
        console.error('Feedback load error:', error.message, error.code);
        setLoading(false);
        setItems([]);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadReplies = (feedbackId: string) => {
    const q = query(collection(db, `feedback/${feedbackId}/replies`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FeedbackReply));
        setReplies(prev => ({ ...prev, [feedbackId]: fetched }));
      },
      () => {
        setReplies(prev => ({ ...prev, [feedbackId]: [] }));
      }
    );
    return unsubscribe;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        title: newTitle.trim(),
        description: newDesc.trim(),
        votes: 1,
        votedBy: [user.uid],
        uid: user.uid,
        userName: profile?.name || 'User',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setNewTitle('');
      setNewDesc('');
      setShowAddModal(false);
      toast(t('feedback.submittedToast'), 'success');
    } catch (err) {
      toast(t('feedback.failedSubmitToast'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (feedbackId: string) => {
    const text = replyText[feedbackId]?.trim();
    if (!user || user.isAnonymous || !text) {
      if (!user || user.isAnonymous) {
        toast(t('feedback.signInToReplyToast'), 'error');
      }
      return;
    }

    setSubmittingReply(prev => ({ ...prev, [feedbackId]: true }));
    try {
      await addDoc(collection(db, `feedback/${feedbackId}/replies`), {
        text,
        uid: user.uid,
        userName: profile?.name || 'User',
        createdAt: serverTimestamp(),
      });
      setReplyText(prev => ({ ...prev, [feedbackId]: '' }));
      toast(t('feedback.replyPosted'), 'success');
    } catch (err) {
      toast(t('feedback.failedReply'), 'error');
    } finally {
      setSubmittingReply(prev => ({ ...prev, [feedbackId]: false }));
    }
  };

  const handleVote = async (itemId: string, hasVoted: boolean) => {
    if (!user || user.isAnonymous) {
      toast(t('feedback.signInToVote'), 'error');
      return;
    }

    try {
      const currentItem = items.find(i => i.id === itemId);
      if (!currentItem) return;

      const newVotedBy = hasVoted
        ? currentItem.votedBy.filter(uid => uid !== user.uid)
        : [...currentItem.votedBy, user.uid];

      const newVotes = newVotedBy.length;

      await addDoc(collection(db, 'feedback'), {
        title: currentItem.title,
        description: currentItem.description,
        votes: newVotes,
        votedBy: newVotedBy,
        uid: currentItem.uid,
        userName: currentItem.userName,
        status: currentItem.status,
        createdAt: currentItem.createdAt,
      });
    } catch (err) {
      console.error('Vote failed', err);
    }
  };

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">{t('feedback.title')}</h1>
            <p className="text-gray-500 dark:text-[#888888] text-sm">{t('feedback.subtitle')}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#E05A1E] hover:bg-[#FF7A3D] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-[0_0_20px_rgba(224,90,30,0.2)]"
          >
            <Plus className="w-4 h-4" /> {t('feedback.newRequest')}
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-[#E05A1E] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-3xl">
            <MessageSquare className="w-12 h-12 text-[#2A2A2A] mx-auto mb-4" />
            <p className="text-gray-500 dark:text-[#888888]">{t('feedback.empty')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {items.map((item) => {
              const itemReplies = replies[item.id] || [];
              const isReplyExpanded = expandedReplies[item.id];
              const hasVoted = user ? item.votedBy?.includes(user.uid) : false;

              return (
                <div
                  key={item.id}
                  className="bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] hover:border-[#E05A1E]/30 transition-all rounded-2xl p-4 sm:p-6"
                >
                  {/* Main feedback */}
                  <div className="flex gap-4 sm:gap-6">
                    <button
                      onClick={() => handleVote(item.id, hasVoted)}
                      className={cn(
                        "flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl border transition-all active:scale-90 flex-shrink-0",
                        hasVoted
                          ? "bg-[#E05A1E]/10 border-[#E05A1E] text-[#E05A1E]"
                          : "bg-white dark:bg-[#0D0D0D] border-gray-200 dark:border-[#2A2A2A] text-gray-400 dark:text-[#555555] hover:border-[#888888] hover:text-gray-500 dark:text-[#888888]"
                      )}
                    >
                      <ArrowBigUp className={cn("w-6 h-6", hasVoted && "fill-current")} />
                      <span className="text-xs font-bold leading-none mt-0.5">{item.votes || 0}</span>
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white text-lg truncate">{item.title}</h3>
                        {item.status !== 'pending' && (
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0",
                            item.status === 'completed' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                          )}>
                            {item.status}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 dark:text-[#888888] text-sm leading-relaxed mb-3">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-[#2A2A2A] flex items-center justify-center text-[10px] text-white font-bold">
                          {item.userName?.[0]}
                        </div>
                        <span className="text-[11px] text-gray-400 dark:text-[#555555]">{t('feedback.requestedBy')} <span className="text-gray-500 dark:text-[#888888]">{item.userName}</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Replies section */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#2A2A2A]">
                    <button
                      onClick={() => setExpandedReplies(prev => ({ ...prev, [item.id]: !isReplyExpanded }))}
                      className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#888888] hover:text-white transition-colors mb-3"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {itemReplies.length} {itemReplies.length === 1 ? t('feedback.repliesOne') : t('feedback.repliesMany')}
                    </button>

                    {isReplyExpanded && (
                      <div className="space-y-3 mb-3">
                        {itemReplies.map(reply => (
                          <div key={reply.id} className="bg-white dark:bg-[#0D0D0D] rounded-xl p-3 ml-4">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-[#2A2A2A] flex items-center justify-center text-[9px] text-white font-bold">
                                {reply.userName?.[0]}
                              </div>
                              <span className="text-xs font-medium text-gray-500 dark:text-[#888888]">{reply.userName}</span>
                              <span className="text-[10px] text-gray-400 dark:text-[#555555]">
                                {reply.createdAt?.toDate?.()?.toLocaleDateString?.() || 'just now'}
                              </span>
                            </div>
                            <p className="text-sm text-[#CCCCCC] leading-relaxed">{reply.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={user && !user.isAnonymous ? t('feedback.writeReply') : t('feedback.signInToReply')}
                        value={replyText[item.id] || ''}
                        onChange={e => setReplyText(prev => ({ ...prev, [item.id]: e.target.value }))}
                        disabled={!user || user.isAnonymous}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !submittingReply[item.id]) {
                            handleSubmitReply(item.id);
                          }
                        }}
                        className="flex-1 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#2A2A2A] focus:border-[#E05A1E] rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors disabled:opacity-50"
                      />
                      <button
                        onClick={() => handleSubmitReply(item.id)}
                        disabled={!user || user.isAnonymous || !replyText[item.id]?.trim() || submittingReply[item.id]}
                        className="flex items-center justify-center w-10 h-10 bg-[#E05A1E] hover:bg-[#FF7A3D] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all active:scale-95"
                      >
                        <Send className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Request Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2A2A2A] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative animate-scale-in">
            <h2 className="text-2xl font-bold text-white mb-6">{t('feedback.modalTitle')}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-[#888888] uppercase tracking-widest mb-2">{t('feedback.modalTitleLabel')}</label>
                <input
                  autoFocus
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder={t('feedback.modalTitlePlaceholder')}
                  className="w-full bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#2A2A2A] focus:border-[#E05A1E] rounded-xl px-4 py-3 text-white outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-[#888888] uppercase tracking-widest mb-2">{t('feedback.modalDescLabel')}</label>
                <textarea
                  required
                  rows={4}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder={t('feedback.modalDescPlaceholder')}
                  className="w-full bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#2A2A2A] focus:border-[#E05A1E] rounded-xl px-4 py-3 text-white outline-none transition-colors resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#2A2A2A] text-gray-500 dark:text-[#888888] font-bold hover:text-white transition-colors active:scale-95"
                >
                  {t('common.cancel')}
                </button>
                <Button
                  type="submit"
                  isLoading={submitting}
                  className="flex-1 py-3 rounded-xl"
                >
                  {t('feedback.submitRequest')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
