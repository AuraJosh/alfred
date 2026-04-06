import { create } from 'zustand';
import { collection, query, where, onSnapshot, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Tracker, LogEntry } from '../types';
import { useAuth } from './useAuth';

interface TrackerState {
    trackers: Tracker[];
    logs: LogEntry[];
    loading: boolean;
    addTracker: (tracker: Omit<Tracker, 'id' | 'userId'>) => Promise<void>;
    updateTracker: (id: string, updates: Partial<Tracker>) => Promise<void>;
    addLog: (log: Omit<LogEntry, 'id' | 'timestamp' | 'userId'>) => Promise<void>;
    deleteTracker: (id: string) => Promise<void>;
}

export const useStore = create<TrackerState>((set) => {
    let unsubscribeTrackers: () => void;
    let unsubscribeLogs: () => void;

    let lastUserId: string | null = null;
    const setupListener = (user: any) => {
        const currentUserId = user?.uid || null;
        if (currentUserId === lastUserId) return;
        lastUserId = currentUserId;

        if (unsubscribeTrackers) unsubscribeTrackers();
        if (unsubscribeLogs) unsubscribeLogs();

        if (user) {
            set({ loading: true });

            const qTrackers = query(collection(db, 'trackers'), where('userId', '==', user.uid));
            unsubscribeTrackers = onSnapshot(qTrackers, (snapshot) => {
                const trackers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Tracker);
                set({ trackers, loading: false });
            }, (error) => {
                if (error.code !== 'permission-denied') {
                    console.error("Trackers listener error:", error);
                }
                set({ loading: false });
            });

            const qLogs = query(collection(db, 'logs'), where('userId', '==', user.uid));
            unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
                const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as LogEntry);
                set({ logs });
            }, (error) => {
                if (error.code !== 'permission-denied') {
                    console.error("Logs listener error:", error);
                }
            });
        } else {
            set({ trackers: [], logs: [], loading: false });
        }
    };

    // Initialize with current state
    setupListener(useAuth.getState().user);

    // Listen to Auth changes
    useAuth.subscribe((state) => {
        setupListener(state.user);
    });

    return {
        trackers: [],
        logs: [],
        loading: true,

        addTracker: async (trackerData) => {
            const user = useAuth.getState().user;
            if (!user) throw new Error("Must be logged in to create trackers");

            const newTrackerRef = doc(collection(db, 'trackers'));
            await setDoc(newTrackerRef, {
                ...trackerData,
                userId: user.uid,
            });
        },

        updateTracker: async (id, updates) => {
            const user = useAuth.getState().user;
            if (!user) return;

            const ref = doc(db, 'trackers', id);
            await setDoc(ref, updates, { merge: true });
        },

        addLog: async (logData) => {
            const user = useAuth.getState().user;
            if (!user) throw new Error("Must be logged in to add logs");

            await addDoc(collection(db, 'logs'), {
                ...logData,
                timestamp: new Date().toISOString(),
                userId: user.uid,
            });
        },

        deleteTracker: async (id) => {
            const state = useStore.getState();
            const logsToDelete = state.logs.filter(l => l.trackerId === id);

            // Delete associated logs from database
            for (const log of logsToDelete) {
                await deleteDoc(doc(db, 'logs', log.id));
            }

            // Delete the tracker itself
            const ref = doc(db, 'trackers', id);
            await deleteDoc(ref);
        }
    };
});
