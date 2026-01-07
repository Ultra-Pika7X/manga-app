"use client";

import { useState } from 'react';
import { useComments, Comment } from '@/hooks/useComments';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Flag, Eye, EyeOff, Send, AlertTriangle } from 'lucide-react';

interface Props {
    mangaId: string;
    chapterId: string;
}

export default function CommentsSection({ mangaId, chapterId }: Props) {
    const { comments, loading, hasMore, loadMore, postComment, reportComment } = useComments(mangaId, chapterId);
    const { user } = useAuth();

    // Form State
    const [text, setText] = useState('');
    const [isSpoiler, setIsSpoiler] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;

        const success = await postComment(text, isSpoiler);
        if (success) {
            setText('');
            setIsSpoiler(false);
        }
    };

    return (
        <section className="max-w-4xl mx-auto px-4 py-8 mb-20 text-white">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Discussion
            </h3>

            {/* Input Form */}
            {user ? (
                <form onSubmit={handleSubmit} className="mb-8 bg-gray-900/50 p-4 rounded-xl border border-white/10">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Join the discussion..."
                        className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 resize-none min-h-[80px]"
                    />
                    <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsSpoiler(!isSpoiler)}
                            className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors ${isSpoiler ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:bg-white/5'}`}
                        >
                            <AlertTriangle className="w-4 h-4" />
                            {isSpoiler ? 'Spoiler Marked' : 'Mark as Spoiler'}
                        </button>
                        <button
                            type="submit"
                            disabled={!text.trim() || loading}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-4 h-4" />
                            Post
                        </button>
                    </div>
                </form>
            ) : (
                <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-xl mb-8 text-center text-blue-200">
                    Please log in to comment.
                </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
                {comments.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} onReport={() => reportComment(comment.id)} />
                ))}

                {comments.length === 0 && !loading && (
                    <p className="text-center text-gray-500 py-8">No comments yet. Be the first!</p>
                )}

                {hasMore && (
                    <button
                        onClick={loadMore}
                        disabled={loading}
                        className="w-full py-3 text-sm text-gray-400 hover:text-white transition-colors border-t border-white/10 mt-4"
                    >
                        {loading ? 'Loading...' : 'Load more comments'}
                    </button>
                )}
            </div>
        </section>
    );
}

function CommentItem({ comment, onReport }: { comment: Comment; onReport: () => void }) {
    const [revealed, setRevealed] = useState(!comment.isSpoiler);

    return (
        <div className="group bg-gray-900/30 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold">
                        {comment.avatar ? <img src={comment.avatar} alt={comment.username} className="w-full h-full rounded-full" /> : comment.username[0]}
                    </div>
                    <div>
                        <span className="font-medium text-sm text-gray-200 block">{comment.username}</span>
                        <span className="text-xs text-gray-500">{new Date(comment.timestamp?.seconds * 1000).toLocaleDateString()}</span>
                    </div>
                </div>
                <button
                    onClick={onReport}
                    className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Report"
                >
                    <Flag className="w-4 h-4" />
                </button>
            </div>

            <div className={`text-sm leading-relaxed ${!revealed ? 'blur-sm select-none cursor-pointer' : 'text-gray-300'}`} onClick={() => !revealed && setRevealed(true)}>
                {comment.text}
            </div>

            {!revealed && (
                <button
                    onClick={() => setRevealed(true)}
                    className="mt-2 text-xs text-red-400 font-medium flex items-center gap-1 hover:underline"
                >
                    <Eye className="w-3 h-3" />
                    Spoiler - Click to reveal
                </button>
            )}
        </div>
    );
}
