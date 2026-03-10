import { create } from 'zustand';
import { collection, query, where, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface WorkoutSet {
    reps: number;
    weight: number;
}

export interface WorkoutEntry {
    id: string;
    timestamp: string;
    exercise: string;
    sets: WorkoutSet[];
    userId: string;
    oneRepMax: number;
    split?: string;
    bodyWeight?: number;
}

export interface CalorieEntry {
    id: string;
    timestamp: string;
    calories: number;
    userId: string;
}

interface GymState {
    workouts: WorkoutEntry[];
    calories: CalorieEntry[];
    loading: boolean;
    addWorkout: (exercise: string, sets: WorkoutSet[], split?: string, bodyWeight?: number, timestamp?: string) => Promise<void>;
    deleteWorkout: (id: string) => Promise<void>;
    addCalories: (calories: number) => Promise<void>;
}

// Simple 1RM calculation (Epley formula)
const calculate1RM = (weight: number, reps: number) => {
    return Math.round(weight * (1 + reps / 30));
};

export const useGymStore = create<GymState>((set) => {
    let unsubscribeWorkouts: () => void;
    let unsubscribeCalories: () => void;

    const setupListener = (user: any) => {
        if (unsubscribeWorkouts) unsubscribeWorkouts();
        if (unsubscribeCalories) unsubscribeCalories();

        if (user) {
            set({ loading: true });

            const qWorkouts = query(collection(db, 'workouts'), where('userId', '==', user.uid));
            unsubscribeWorkouts = onSnapshot(qWorkouts, (snapshot) => {
                const workouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as WorkoutEntry);
                set({ workouts, loading: false });
            });

            const qCalories = query(collection(db, 'calories'), where('userId', '==', user.uid));
            unsubscribeCalories = onSnapshot(qCalories, (snapshot) => {
                const calories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as CalorieEntry);
                set({ calories });
            });
        } else {
            set({ workouts: [], calories: [], loading: false });
        }
    };

    setupListener(useAuth.getState().user);
    useAuth.subscribe((state) => setupListener(state.user));

    return {
        workouts: [],
        calories: [],
        loading: true,

        deleteWorkout: async (id) => {
            const user = useAuth.getState().user;
            if (!user) throw new Error("Must be logged in");
            await deleteDoc(doc(db, 'workouts', id));
        },

        addWorkout: async (exercise, sets, split, bodyWeight, timestamp) => {
            const user = useAuth.getState().user;
            if (!user) throw new Error("Must be logged in");

            // Calculate the max 1RM for this workout session
            let sessionMax1RM = 0;
            sets.forEach(s => {
                const rm = calculate1RM(s.weight, s.reps);
                if (rm > sessionMax1RM) sessionMax1RM = rm;
            });

            const data: any = {
                exercise,
                sets,
                oneRepMax: sessionMax1RM,
                timestamp: timestamp || new Date().toISOString(),
                userId: user.uid,
            };

            if (split) data.split = split;
            if (bodyWeight) data.bodyWeight = bodyWeight;

            await addDoc(collection(db, 'workouts'), data);
        },

        addCalories: async (caloriesAmount) => {
            const user = useAuth.getState().user;
            if (!user) throw new Error("Must be logged in");

            await addDoc(collection(db, 'calories'), {
                calories: caloriesAmount,
                timestamp: new Date().toISOString(),
                userId: user.uid,
            });
        }
    };
});
