import { create } from 'zustand';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface PubLog {
    id: string;
    timestamp: string;
    pubName: string;
    pintPrice: number;
    atmosphere: number;
    pepsiMax?: boolean;
    userId: string;
}

interface SocialState {
    pubLogs: PubLog[];
    loading: boolean;
    addPubLog: (log: Omit<PubLog, 'id' | 'timestamp' | 'userId'>) => Promise<void>;
    deletePubLog: (id: string) => Promise<void>;
}

export const useSocialStore = create<SocialState>((set) => {
    let unsubscribePub: () => void;

    let lastUserId: string | null = null;
    const setupListener = (user: any) => {
        const currentUserId = user?.uid || null;
        if (currentUserId === lastUserId) return;
        lastUserId = currentUserId;

        if (unsubscribePub) unsubscribePub();

        if (user) {
            set({ loading: true });

            const qPub = query(collection(db, 'pub_logs'), where('userId', '==', user.uid));
            unsubscribePub = onSnapshot(qPub, (snapshot) => {
                const pubLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as PubLog);
                set({ pubLogs, loading: false });
            }, (error) => {
                if (error.code !== 'permission-denied') {
                    console.error("Pub logs listener error:", error);
                }
                set({ loading: false });
            });
        } else {
            set({ pubLogs: [], loading: false });
        }
    };

    setupListener(useAuth.getState().user);
    useAuth.subscribe((state) => setupListener(state.user));

    return {
        pubLogs: [],
        loading: true,

        addPubLog: async (log) => {
            const user = useAuth.getState().user;
            if (!user) throw new Error("Must be logged in");

            await addDoc(collection(db, 'pub_logs'), {
                ...log,
                timestamp: new Date().toISOString(),
                userId: user.uid,
            });
        },

        deletePubLog: async (id) => {
            const { doc, deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, 'pub_logs', id));
        }
    };
});
