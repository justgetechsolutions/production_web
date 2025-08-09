import React, { useEffect, useState, useRef } from 'react';
import { getComments, postComment } from '../utils/api-client.ts';

// Types
interface MenuItem {
  _id?: string;
  name: string;
  imageUrl?: string;
}

interface Comment {
  _id: string;
  userId: { email: string } | string;
  text: string;
  createdAt: string;
  helpfulCount: number;
  rating?: number;
}

interface CommentModalProps {
  open: boolean;
  onClose: () => void;
  menuItem: MenuItem;
  mode?: 'view' | 'submit';
  onCommented?: () => void; // NEW
}

const CommentModal: React.FC<CommentModalProps> = ({ open, onClose, menuItem, mode = 'submit', onCommented }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [sort, setSort] = useState<'newest' | 'helpful'>('newest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !menuItem._id) return;
    setLoading(true);
    setError('');
    getComments(menuItem._id, sort)
      .then(setComments)
      .catch(() => setError('Failed to load comments.'))
      .finally(() => setLoading(false));
  }, [open, menuItem._id, sort]);

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, comments]);

  const handlePost = async () => {
    if (!newComment.trim() || !rating) return;
    if (!menuItem._id || typeof menuItem._id !== 'string') {
      setError('Invalid menu item. Cannot post comment.');
      return;
    }
    setSubmitting(true);
    try {
      // For anonymous, prepend nickname to comment text
      const text = nickname ? `[${nickname}] ${newComment}` : `[Anonymous] ${newComment}`;
      const cookie = document.cookie.split('; ').find(row => row.startsWith('restaurantId='));
      const restaurantId = (cookie ? decodeURIComponent(cookie.split('=')[1]) : undefined) as string | undefined;
      await postComment(menuItem._id, text, nickname, restaurantId, rating);
      setNewComment('');
      setNickname('');
      setRating(0);
      // Refresh comments
      const updated = await getComments(menuItem._id, sort);
      setComments(updated);
      if (onCommented) onCommented(); // Notify parent
      onClose(); // Close modal
    } catch {
      setError('Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (open) {
      setNewComment('');
      setNickname('');
      setRating(0);
      setSubmitting(false);
      setError('');
    }
  }, [open]);

  function timeAgo(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black bg-opacity-40 transition-opacity">
      <div
        className="absolute inset-0 bg-black bg-opacity-40"
        onClick={(e) => {
          if ((e.target as HTMLElement).classList.contains('bg-opacity-40')) {
            onClose();
          }
        }}
      />

      <div className="relative z-10 w-full md:max-w-md bg-white rounded-t-2xl md:rounded-2xl shadow-lg p-4 md:p-6 max-h-[90vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-lg">Comments for: <span className="text-blue-600">{menuItem.name}</span></div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-xl font-bold">×</button>
        </div>

        {/* Sort */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">💬 {comments.length}</span>
            <select
              className="ml-2 border rounded px-2 py-1 text-sm"
              value={sort}
              onChange={e => setSort(e.target.value as 'newest' | 'helpful')}
            >
              <option value="newest">Newest</option>
              <option value="helpful">Most Helpful</option>
            </select>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4 mb-4">
          {loading ? (
            <div>Loading comments...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : comments.length === 0 ? (
            <div className="text-gray-500">No comments yet.</div>
          ) : (
            comments.map(c => (
              <div key={c._id} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-700">
                  {typeof c.userId === 'object' && c.userId.email ? c.userId.email[0].toUpperCase() : '?'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="font-semibold">{typeof c.userId === 'object' && c.userId.email ? c.userId.email : 'User'}</span>
                    <span className="text-gray-400">· {timeAgo(c.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 mb-1">
                    {c.rating ? Array.from({length: c.rating}).map((_,i) => <span key={i} className="text-yellow-500">★</span>) : null}
                    {c.rating ? Array.from({length: 5 - c.rating}).map((_,i) => <span key={i} className="text-gray-300">★</span>) : null}
                  </div>
                  <div className="text-gray-900 mt-1">{c.text}</div>
                  <div className="text-xs text-gray-500 mt-1">👍 {c.helpfulCount}</div>
                </div>
              </div>
            ))
          )}
          {/* Auto-scroll target */}
          <div ref={bottomRef} />
        </div>

        {/* Add Comment Section */}
        {mode === 'submit' ? (
          <div className="border-t pt-3">
            <div className="flex flex-col gap-2 items-stretch">
              {/* Star rating selector */}
              <div className="flex items-center gap-1 mb-2">
                {[1,2,3,4,5].map(star => (
                  <button
                    key={star}
                    type="button"
                    className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} focus:outline-none`}
                    onClick={() => setRating(star)}
                    disabled={submitting}
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    ★
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">{rating ? `${rating} / 5` : 'Select rating'}</span>
              </div>
              <input
                className="border rounded px-3 py-2"
                placeholder="Your nickname (optional)"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                maxLength={30}
                disabled={submitting}
              />
              <div className="flex gap-2 items-center">
                <input
                  className="flex-1 border rounded px-3 py-2"
                  placeholder="Add your comment..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  disabled={submitting}
                  maxLength={300}
                />
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                  onClick={handlePost}
                  disabled={submitting || newComment.trim().length === 0 || !rating}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Slide up animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.25s cubic-bezier(.4,0,.2,1);
        }
      `}</style>
    </div>
  );
};

export default CommentModal;
