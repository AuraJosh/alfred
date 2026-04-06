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
    activePhase: 'idle' | 'running' | 'paused';
    activeEvents: Array<{ type: string; time: number }>;
    activeSubject: string;
    activeNotes: string;
    updateActiveSession: (updates: { phase?: 'idle' | 'running' | 'paused'; events?: Array<{ type: string; time: number }>; subject?: string; notes?: string }) => Promise<void>;
    addSession: (subject: string, durationMinutes: number, notes?: string, eventLog?: Array<{ type: string; time: number }>, timestamp?: string) => Promise<void>;
    addTask: (subject: string, module: string, content: string) => Promise<void>;
    toggleTask: (id: string, isCompleted: boolean) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    updateSession: (id: string, updates: Partial<StudySession>) => Promise<void>;
    deleteSession: (id: string) => Promise<void>;
}

export const useStudyStore = create<StudyState>((set) => {
    let unsubscribeSessions: () => void;
    let unsubscribeTasks: () => void;
    let unsubscribeActive: () => void;

    let lastUserId: string | null = null;
    const setupListener = (user: any) => {
        const currentUserId = user?.uid || null;
        if (currentUserId === lastUserId) return;
        lastUserId = currentUserId;

        if (unsubscribeSessions) unsubscribeSessions();
        if (unsubscribeTasks) unsubscribeTasks();
        if (unsubscribeActive) unsubscribeActive();

        if (user) {
            set({ loading: true });

            const qSessions = query(collection(db, 'study_sessions'), where('userId', '==', user.uid));
            unsubscribeSessions = onSnapshot(qSessions, (snapshot) => {
                const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as StudySession);
                set({ sessions });
            }, (error) => {
                if (error.code !== 'permission-denied') {
                    console.error("Study sessions listener error:", error);
                }
            });

            const qTasks = query(collection(db, 'study_tasks'), where('userId', '==', user.uid));
            unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
                const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as StudyTask);
                set({ tasks, loading: false });
            }, (error) => {
                if (error.code !== 'permission-denied') {
                    console.error("Study tasks listener error:", error);
                }
                set({ loading: false });
            });

            unsubscribeActive = onSnapshot(doc(db, 'active_study_sessions', user.uid), (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    set({
                        activePhase: data.phase || 'idle',
                        activeEvents: data.events || [],
                        activeSubject: data.subject || 'General',
                        activeNotes: data.notes || ''
                    });
                } else {
                    set({
                        activePhase: 'idle',
                        activeEvents: [],
                        activeSubject: 'General',
                        activeNotes: ''
                    });
                }
            }, (error) => {
                if (error.code !== 'permission-denied') {
                    console.error("Active study session listener error:", error);
                }
            });
        } else {
            set({ sessions: [], tasks: [], loading: false, activePhase: 'idle', activeEvents: [], activeSubject: 'General', activeNotes: '' });
        }
    };

    setupListener(useAuth.getState().user);
    useAuth.subscribe((state) => setupListener(state.user));

    return {
        sessions: [],
        tasks: [],
        activePhase: 'idle',
        activeEvents: [],
        activeSubject: 'General',
        activeNotes: '',
        loading: true,

        updateActiveSession: async (updates) => {
            const user = useAuth.getState().user;
            if (!user) throw new Error("Must be logged in");
            
            const { setDoc } = await import('firebase/firestore');
            await setDoc(doc(db, 'active_study_sessions', user.uid), {
                ...updates,
                userId: user.uid
            }, { merge: true });
        },

        addSession: async (subject, durationMinutes, notes, eventLog, timestamp) => {
            const user = useAuth.getState().user;
            if (!user) throw new Error("Must be logged in");

            await addDoc(collection(db, 'study_sessions'), {
                subject,
                durationMinutes,
                ...(notes ? { notes } : {}),
                ...(eventLog ? { eventLog } : {}),
                timestamp: timestamp || new Date().toISOString(),
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
        },
        updateSession: async (id, updates) => {
            await updateDoc(doc(db, 'study_sessions', id), updates);
        },
        deleteSession: async (id) => {
            await deleteDoc(doc(db, 'study_sessions', id));
        }
    };
});
