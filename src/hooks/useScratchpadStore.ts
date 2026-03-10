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

    const setupListener = (user: any) => {
        if (unsubscribe) unsubscribe();

        if (user) {
            set({ loading: true });

            const q = query(collection(db, 'scratchpad'), where('userId', '==', user.uid));
            unsubscribe = onSnapshot(q, (snapshot) => {
                const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ScratchpadEntry);
                set({ entries, loading: false });
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
