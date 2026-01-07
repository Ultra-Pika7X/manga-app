import { useState, useCallback, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    serverTimestamp,
    doc,
    updateDoc,
    increment,
    DocumentSnapshot
} from 'firebase/firestore';

export interface Comment {
    id: string;
    mangaId: string;
    chapterId: string;
    userId: string;
    username: string;
    avatar?: string;
    text: string;
    isSpoiler: boolean;
    timestamp: any;
    reportCount: number;
    hidden: boolean;
}

const PAGE_SIZE = 10;

export function useComments(mangaId: string, chapterId: string) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const loadComments = useCallback(async (reset = false) => {
        if (!db) return;
        setLoading(true);

        try {
            let q = query(
                collection(db, 'comments'),
                where('mangaId', '==', mangaId),
                where('chapterId', '==', chapterId),
                where('hidden', '==', false), // Filter out hidden posts
                orderBy('timestamp', 'desc'),
                limit(PAGE_SIZE)
            );

            if (!reset && lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const snapshot = await getDocs(q);
            const newComments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Comment));

            setComments(prev => reset ? newComments : [...prev, ...newComments]);
            setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length === PAGE_SIZE);

        } catch (error) {
            console.error("Error loading comments:", error);
        } finally {
            setLoading(false);
        }
    }, [mangaId, chapterId, lastDoc]);

    const postComment = async (text: string, isSpoiler: boolean) => {
        const user = auth.currentUser;
        if (!user || !text.trim()) return;

        try {
            const newComment = {
                mangaId,
                chapterId,
                userId: user.uid,
                username: user.displayName || 'Anonymous',
                avatar: user.photoURL || '',
                text: text.trim(),
                isSpoiler,
                timestamp: serverTimestamp(),
                reportCount: 0,
                hidden: false
            };

            await addDoc(collection(db, 'comments'), newComment);

            // Optimistic update or reload?
            // Reload is safer for IDs and Timestamps
            loadComments(true);
            return true;
        } catch (error) {
            console.error("Error posting comment:", error);
            return false;
        }
    };

    const reportComment = async (commentId: string) => {
        if (!auth.currentUser) return;
        try {
            const ref = doc(db, 'comments', commentId);
            await updateDoc(ref, {
                reportCount: increment(1)
            });
            // Hide locally immediately for UX
            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (error) {
            console.error("Error reporting comment:", error);
        }
    };

    // Initial load
    useEffect(() => {
        loadComments(true);
    }, [mangaId, chapterId]);

    return {
        comments,
        loading,
        hasMore,
        loadMore: () => loadComments(false),
        postComment,
        reportComment,
        refresh: () => loadComments(true)
    };
}
