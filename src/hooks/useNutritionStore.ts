import { create } from 'zustand';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface NutritionEntry {
    id: string;
    timestamp: string;
    meal: string;
    ingredients?: string;
    calories: number;
    userId: string;
}

interface NutritionState {
    entries: NutritionEntry[];
    loading: boolean;
    addEntry: (meal: string, calories: number, ingredients?: string, timestamp?: string) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
}

export const useNutritionStore = create<NutritionState>((set) => {
    let unsubscribe: () => void;

    const setupListener = (user: any) => {
        if (unsubscribe) unsubscribe();

        if (user) {
            set({ loading: true });

            // We use 'nutrition' collection to avoid conflict with the old 'calories' collection 
            // from the simple Gym module. Or we could use 'calories' if we want backwards compat, 
            // but let's use a fresh 'nutrition' collection for this complex data.
            const q = query(collection(db, 'nutrition'), where('userId', '==', user.uid));
            unsubscribe = onSnapshot(q, (snapshot) => {
                const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as NutritionEntry);
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

        addEntry: async (meal, calories, ingredients, timestamp) => {
            const user = useAuth.getState().user;
            if (!user) throw new Error("Must be logged in");

            await addDoc(collection(db, 'nutrition'), {
                meal,
                calories,
                ...(ingredients ? { ingredients } : {}),
                timestamp: timestamp || new Date().toISOString(),
                userId: user.uid,
            });
        },

        deleteEntry: async (id) => {
            await deleteDoc(doc(db, 'nutrition', id));
        }
    };
});
