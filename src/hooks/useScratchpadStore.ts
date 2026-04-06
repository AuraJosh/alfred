import { create } from 'zustand';
import { collection, query, where, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface ScratchpadEntry {
    id: string;
    text: string;
    timestamp: string;
    userId: string;
}

interface ScratchpadState {
    entries: ScratchpadEntry[];
    loading: boolean;
    addEntry: (text: string, timestamp?: string) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
}

export const useScratchpadStore = create<ScratchpadState>((set) => {
    let unsubscribe: () => void;

    let lastUserId: string | null = null;
    const setupListener = (user: any) => {
        const currentUserId = user?.uid || null;
        if (currentUserId === lastUserId) return;
        lastUserId = currentUserId;

        if (unsubscribe) unsubscribe();

        if (user) {
            set({ loading: true });
            const q = query(collection(db, 'scratchpad'), where('userId', '==', user.uid));
            unsubscribe = onSnapshot(q, (snapshot) => {
                const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ScratchpadEntry);
                set({ entries, loading: false });
            }, (error) => {
                if (error.code !== 'permission-denied') {
                    console.error("Scratchpad listener error:", error);
                }
                set({ loading: false });
            });
        } else {
            set({ entries: [], loading: false });
        }
    };

    setupListener(useAuth.getState().user);
    useAuth.subscribe((state) => setupListener(state.user));

    return {
        entries: [],
        loading: true,

        addEntry: async (text, timestamp) => {
            const user = useAuth.getState().user;
            if (!user) throw new Error("Must be logged in");

            await addDoc(collection(db, 'scratchpad'), {
                text,
                timestamp: timestamp || new Date().toISOString(),
                userId: user.uid,
            });
        },

        deleteEntry: async (id) => {
            const user = useAuth.getState().user;
            if (!user) throw new Error("Must be logged in");
            await deleteDoc(doc(db, 'scratchpad', id));
        }
    };
});
