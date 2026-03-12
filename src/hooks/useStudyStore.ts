import { create } from 'zustand';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface StudySession {
    id: string;
    timestamp: string;
    subject: string;
    durationMinutes: number;
    notes?: string;
    userId: string;
    eventLog?: Array<{ type: string; time: number }>;
}

export interface StudyTask {
    id: string;
    subject: string;
    module: string; // Grouping category (e.g., 'Core Mathematics', 'Marketing')
    content: string;
    isCompleted: boolean;
    createdAt: string;
    completedAt?: string;
    userId: string;
}

interface StudyState {
    sessions: StudySession[];
    tasks: StudyTask[];
    loading: boolean;
    addSession: (subject: string, durationMinutes: number, notes?: string, eventLog?: Array<{ type: string; time: number }>) => Promise<void>;
    addTask: (subject: string, module: string, content: string) => Promise<void>;
    toggleTask: (id: string, isCompleted: boolean) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
}

export const useStudyStore = create<StudyState>((set) => {
    let unsubscribeSessions: () => void;
    let unsubscribeTasks: () => void;

    const setupListener = (user: any) => {
        if (unsubscribeSessions) unsubscribeSessions();
        if (unsubscribeTasks) unsubscribeTasks();

        if (user) {
            set({ loading: true });

            const qSessions = query(collection(db, 'study_sessions'), where('userId', '==', user.uid));
            unsubscribeSessions = onSnapshot(qSessions, (snapshot) => {
                const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as StudySession);
                set({ sessions });
            });

            const qTasks = query(collection(db, 'study_tasks'), where('userId', '==', user.uid));
            unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
                const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as StudyTask);
                set({ tasks, loading: false });
            });
        } else {
            set({ sessions: [], tasks: [], loading: false });
        }
    };

    setupListener(useAuth.getState().user);
    useAuth.subscribe((state) => setupListener(state.user));

    return {
        sessions: [],
        tasks: [],
        loading: true,

        addSession: async (subject, durationMinutes, notes, eventLog) => {
            const user = useAuth.getState().user;
            if (!user) throw new Error("Must be logged in");

            await addDoc(collection(db, 'study_sessions'), {
                subject,
                durationMinutes,
                ...(notes ? { notes } : {}),
                ...(eventLog ? { eventLog } : {}),
                timestamp: new Date().toISOString(),
                userId: user.uid,
            });
        },

        addTask: async (subject, module, content) => {
            const user = useAuth.getState().user;
            if (!user) throw new Error("Must be logged in");

            await addDoc(collection(db, 'study_tasks'), {
                subject,
                module,
                content,
                isCompleted: false,
                createdAt: new Date().toISOString(),
                userId: user.uid,
            });
        },

        toggleTask: async (id, isCompleted) => {
            await updateDoc(doc(db, 'study_tasks', id), {
                isCompleted,
                completedAt: isCompleted ? new Date().toISOString() : null
            });
        },

        deleteTask: async (id) => {
            await deleteDoc(doc(db, 'study_tasks', id));
        }
    };
});
