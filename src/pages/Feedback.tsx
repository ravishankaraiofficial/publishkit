import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { PageContainer } from '../components/layout/PageContainer';
import { useToast } from '../components/ui/Toast';
import { ArrowBigUp, MessageSquare, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';

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
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
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
      },
      (error) => {
        console.error('Feedback load error:', error);
        setLoading(false);
        toast('Failed to load feedback', 'error');
      }
    );
    return () => unsubscribe();
  }, [toast]);

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
      toast('Feedback submitted!', 'success');
    } catch (err) {
      toast('Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (itemId: string, hasVoted: boolean) => {
    if (!user || user.isAnonymous) {
      toast('Please sign in to vote', 'error');
      return;
    }

    const itemRef = doc(db, 'feedback', itemId);
    try {
      if (hasVoted) {
        await updateDoc(itemRef, {
          votes: increment(-1),
          votedBy: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(itemRef, {
          votes: increment(1),
          votedBy: arrayUnion(user.uid)
        });
      }
    } catch (err) {
      console.error('Vote failed', err);
    }
  };

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Feedback Board</h1>
            <p className="text-[#888888] text-sm">Vote for existing features or request new ones.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#E05A1E] hover:bg-[#FF7A3D] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-[0_0_20px_rgba(224,90,30,0.2)]"
          >
            <Plus className="w-4 h-4" /> New Request
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-[#E05A1E] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl">
            <MessageSquare className="w-12 h-12 text-[#2A2A2A] mx-auto mb-4" />
            <p className="text-[#888888]">No requests yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const hasVoted = user ? item.votedBy?.includes(user.uid) : false;
              return (
                <div 
                  key={item.id}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#E05A1E]/30 transition-all rounded-2xl p-4 sm:p-6 flex gap-4 sm:gap-6 group"
                >
                  <button
                    onClick={() => handleVote(item.id, hasVoted)}
                    className={cn(
                      "flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl border transition-all active:scale-90",
                      hasVoted 
                        ? "bg-[#E05A1E]/10 border-[#E05A1E] text-[#E05A1E]" 
                        : "bg-[#0D0D0D] border-[#2A2A2A] text-[#555555] hover:border-[#888888] hover:text-[#888888]"
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
                          "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                          item.status === 'completed' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        )}>
                          {item.status}
                        </span>
                      )}
                    </div>
                    <p className="text-[#888888] text-sm leading-relaxed mb-3">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[10px] text-white font-bold">
                        {item.userName?.[0]}
                      </div>
                      <span className="text-[11px] text-[#555555]">Requested by <span className="text-[#888888]">{item.userName}</span></span>
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
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative animate-scale-in">
            <h2 className="text-2xl font-bold text-white mb-6">New Feature Request</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-[#888888] uppercase tracking-widest mb-2">Title</label>
                <input
                  autoFocus
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Add Instagram Reel format"
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] focus:border-[#E05A1E] rounded-xl px-4 py-3 text-white outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#888888] uppercase tracking-widest mb-2">Description</label>
                <textarea
                  required
                  rows={4}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Explain why this feature would be useful..."
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] focus:border-[#E05A1E] rounded-xl px-4 py-3 text-white outline-none transition-colors resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl border border-[#2A2A2A] text-[#888888] font-bold hover:text-white transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  isLoading={submitting}
                  className="flex-1 py-3 rounded-xl"
                >
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
