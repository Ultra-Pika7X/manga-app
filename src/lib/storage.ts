import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { db, auth } from './firebase';
import { doc, setDoc, getDoc, getDocs, collection, Timestamp, writeBatch } from 'firebase/firestore';

// --- Interfaces ---

export interface ProgressItem {
    anilistId: string;
    episode: string; // Chapter ID
    progress: number;
    lastSource: string;
    lastUpdated: number;
}

export interface SourceHistoryItem {
    anilistId: string;
    sourceName: string;
    successCount: number;
    lastSuccess: number;
}

export interface UserPreferences {
    preferredSource: string;
    autoNext: boolean;
    autoSync: boolean;
}

interface StorageDB extends DBSchema {
    continueWatching: {
        key: string; // anilistId
        value: ProgressItem;
    };
    sourceHistory: {
        key: [string, string]; // [anilistId, sourceName]
        value: SourceHistoryItem;
    };
}

const DB_NAME = 'manga-app-hybrid-storage';
const DB_VERSION = 1;

class HybridStorageService {
    private dbPromise: Promise<IDBPDatabase<StorageDB>> | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.dbPromise = openDB<StorageDB>(DB_NAME, DB_VERSION, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains('continueWatching')) {
                        db.createObjectStore('continueWatching', { keyPath: 'anilistId' });
                    }
                    if (!db.objectStoreNames.contains('sourceHistory')) {
                        db.createObjectStore('sourceHistory', { keyPath: ['anilistId', 'sourceName'] });
                    }
                },
            });
        }
    }

    private async getDB() {
        if (!this.dbPromise) throw new Error("IndexedDB not supported");
        return this.dbPromise;
    }

    // --- Progress (Hybrid) ---

    async getProgress(anilistId: string): Promise<ProgressItem | undefined> {
        const db = await this.getDB();
        return db.get('continueWatching', anilistId);
    }

    async saveProgress(item: ProgressItem) {
        // 1. Local Write (Always works)
        const db = await this.getDB();
        await db.put('continueWatching', item);

        // 2. Cloud Write (If logged in)
        const user = auth.currentUser;
        if (user) {
            try {
                const docRef = doc(this.getFirestore(), 'users', user.uid, 'progress', item.anilistId);
                await setDoc(docRef, {
                    ...item,
                    updatedAt: Timestamp.fromMillis(item.lastUpdated)
                }, { merge: true });
            } catch (e) {
                console.warn('[HybridStorage] Cloud save failed (offline?)', e);
            }
        }
    }

    async getAllProgress(): Promise<ProgressItem[]> {
        const db = await this.getDB();
        return db.getAll('continueWatching');
    }

    // --- Source Reliability (Local Only as per rules, or Sync?) ---
    // User schema says "sourceHistory" in IDB, but doesn't explicitly ask for it in Firebase Sync list.
    // The prompt lists "users/{userId}/progress" and "preferences" for Firebase.
    // So Source History is Local Only.

    async trackSourceSuccess(anilistId: string, sourceName: string) {
        const db = await this.getDB();
        const key: [string, string] = [anilistId, sourceName];

        const existing = await db.get('sourceHistory', key);
        const newItem: SourceHistoryItem = {
            anilistId,
            sourceName,
            successCount: (existing?.successCount || 0) + 1,
            lastSuccess: Date.now()
        };

        await db.put('sourceHistory', newItem);
    }

    async getBestSource(anilistId: string): Promise<string | null> {
        const db = await this.getDB();
        // IDB doesn't support complex queries easily on composite keys without indices
        // We fetch all for this DB size is fine, or use a cursor.
        // Optimization: Create index if needed. For now, getAll is okay for small datasets.

        const all = await db.getAll('sourceHistory');
        const relevant = all.filter(x => x.anilistId === anilistId);

        if (relevant.length === 0) return null;

        // Sort by success count
        relevant.sort((a, b) => b.successCount - a.successCount);
        return relevant[0].sourceName;
    }

    // --- Preferences (Hybrid) ---

    async getPreferences(): Promise<UserPreferences> {
        // LocalStorage for prefs is faster/easier than IDB, but let's stick to IDB if we want uniform storage
        // Or assume Preferences are loaded into Context.
        // Let's implement basics here.
        // For simple key-values, localStorage is fine, but for "Hybrid" design, let's sync.

        const stored = localStorage.getItem('user_prefs');
        return stored ? JSON.parse(stored) : { preferredSource: 'mangakakalot', autoNext: true, autoSync: true };
    }

    async savePreferences(prefs: UserPreferences) {
        localStorage.setItem('user_prefs', JSON.stringify(prefs));

        const user = auth.currentUser;
        if (user) {
            try {
                const docRef = doc(this.getFirestore(), 'users', user.uid, 'preferences', 'settings');
                await setDoc(docRef, prefs, { merge: true });
            } catch (e) {
                console.warn('[HybridStorage] Cloud prefs save failed', e);
            }
        }
    }

    // --- Sync Logic ---

    async sync() {
        const user = auth.currentUser;
        if (!user) return;

        console.log('[HybridStorage] Starting Sync...');
        const db = await this.getDB();
        const firestore = this.getFirestore();

        try {
            // 1. Pull Progress from Cloud
            const colRef = collection(firestore, 'users', user.uid, 'progress');
            const snapshot = await getDocs(colRef);

            const batch = writeBatch(firestore);
            let batchCount = 0;

            for (const docSnap of snapshot.docs) {
                const remote = docSnap.data();
                const local = await db.get('continueWatching', remote.anilistId);

                const remoteTime = remote.updatedAt?.toMillis() || 0;
                const localTime = local?.lastUpdated || 0;

                if (remoteTime > localTime) {
                    // Cloud Wins -> Update Local
                    await db.put('continueWatching', {
                        anilistId: remote.anilistId,
                        episode: remote.episode,
                        progress: remote.progress,
                        lastSource: remote.lastSource,
                        lastUpdated: remoteTime
                    });
                }
                // If Local is newer, we will Push later (or now?)
                // Actually easier to just push all "Dirtier" locals.
            }

            // 2. Push Newer Locals to Cloud
            const allLocals = await db.getAll('continueWatching');
            for (const local of allLocals) {
                // Check if we need to push?
                // Minimal check: We can try to read the specific doc or just overwrite if we are confident.
                // To save reads, we can blindly overwrite if we think we have changed recently.
                // Better: We already iterated remote docs.

                // Let's simplified "Last Write Wins": If local.lastUpdated > now - session_duration?
                // Or just push everything? 
                // Creating a batch for all local items might be expensive.
                // User requirement: "Syncs only when logged in".

                // Let's rely on the `saveProgress` trigger for active updates. 
                // This `sync()` function is primarily for "Initial Load" (Pull).
                // But for robust Full Sync:

                // Logic: If local item NOT in remote snapshot OR local > remote
                // We checked "Cloud > Local".
                // We missed "Local > Cloud".

                // Optimized: We iterate locals.
                const match = snapshot.docs.find(d => d.id === local.anilistId);
                const remoteTime = match?.data().updatedAt?.toMillis() || 0;

                if (local.lastUpdated > remoteTime) {
                    const docRef = doc(firestore, 'users', user.uid, 'progress', local.anilistId);
                    batch.set(docRef, {
                        ...local,
                        updatedAt: Timestamp.fromMillis(local.lastUpdated)
                    });
                    batchCount++;
                }
            }

            if (batchCount > 0) {
                await batch.commit();
                console.log(`[HybridStorage] Pushed ${batchCount} updates to cloud.`);
            }

        } catch (e) {
            console.error('[HybridStorage] Sync failed', e);
        }
    }

    private getFirestore() {
        // Safe access to imported db
        return db;
    }
}

export const HybridStorage = new HybridStorageService();
