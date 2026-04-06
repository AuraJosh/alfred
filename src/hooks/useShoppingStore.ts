import { create } from 'zustand';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ShoppingList } from '../types';
import { useAuth } from './useAuth';

interface ShoppingStore {
    lists: ShoppingList[];
    loading: boolean;
    addList: (name: string) => Promise<void>;
    updateListName: (id: string, name: string) => Promise<void>;
    deleteList: (id: string) => Promise<void>;
}

export const useShoppingStore = create<ShoppingStore>((set) => {
    let unsubscribeLists: () => void;

    let lastUserId: string | null = null;
    const setupListener = (user: any) => {
        const currentUserId = user?.uid || null;
        if (currentUserId === lastUserId) return;
        lastUserId = currentUserId;

        if (unsubscribeLists) unsubscribeLists();

        if (user) {
            set({ loading: true });
            const qLists = query(collection(db, 'shopping_lists'), where('userId', '==', user.uid));

            unsubscribeLists = onSnapshot(qLists, (snapshot) => {
                const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ShoppingList);
                set({ lists, loading: false });
            }, (error) => {
                if (error.code !== 'permission-denied') {
                    console.error("Shopping lists listener error:", error);
                }
                set({ loading: false });
            });
        } else {
            set({ lists: [], loading: false });
        }
    };

    setupListener(useAuth.getState().user);

    useAuth.subscribe((state) => {
        setupListener(state.user);
    });

    return {
        lists: [],
        loading: true,

        addList: async (name) => {
            const user = useAuth.getState().user;
            if (!user) throw new Error("Must be logged in");

            await addDoc(collection(db, 'shopping_lists'), {
                name,
                userId: user.uid,
                createdAt: new Date().toISOString(),
            });
        },

        updateListName: async (id, name) => {
            const ref = doc(db, 'shopping_lists', id);
            await updateDoc(ref, { name });
        },

        deleteList: async (id) => {
            const user = useAuth.getState().user;
            if (!user) return;

            // Delete the list
            await deleteDoc(doc(db, 'shopping_lists', id));

            // Also delete all items in this list
            const qItems = query(
                collection(db, 'todos'), 
                where('userId', '==', user.uid),
                where('type', '==', 'shopping'),
                where('listId', '==', id)
            );
            const snapshot = await getDocs(qItems);
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
    };
});
