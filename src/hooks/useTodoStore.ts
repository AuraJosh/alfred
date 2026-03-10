import { create } from 'zustand';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Todo } from '../types';
import { useAuth } from './useAuth';

interface TodoState {
    todos: Todo[];
    loading: boolean;
    addTodo: (todo: Omit<Todo, 'id' | 'userId'>) => Promise<void>;
    updateTodoStatus: (id: string, status: Todo['status']) => Promise<void>;
    deleteTodo: (id: string) => Promise<void>;
}

export const useTodoStore = create<TodoState>((set) => {
    let unsubscribeTodos: () => void;

    const setupListener = (user: any) => {
        if (unsubscribeTodos) unsubscribeTodos();

        if (user) {
            set({ loading: true });
            const qTodos = query(collection(db, 'todos'), where('userId', '==', user.uid));

            unsubscribeTodos = onSnapshot(qTodos, (snapshot) => {
                const todos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Todo);
                set({ todos, loading: false });
            });
        } else {
            set({ todos: [], loading: false });
        }
    };

    // Initialize with current state (Important for Hot Reloading)
    setupListener(useAuth.getState().user);

    // Listen for auth changes
    useAuth.subscribe((state) => {
        setupListener(state.user);
    });

    return {
        todos: [],
        loading: true,

        addTodo: async (todoData) => {
            const user = useAuth.getState().user;
            if (!user) throw new Error("Must be logged in");

            await addDoc(collection(db, 'todos'), {
                ...todoData,
                userId: user.uid,
                createdAt: new Date().toISOString(),
            });
        },

        updateTodoStatus: async (id, status) => {
            const ref = doc(db, 'todos', id);
            await updateDoc(ref, {
                status,
                completedAt: status === 'done' ? new Date().toISOString() : null
            });
        },

        deleteTodo: async (id) => {
            const ref = doc(db, 'todos', id);
            await deleteDoc(ref);
        }
    };
});
