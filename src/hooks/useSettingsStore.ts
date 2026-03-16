import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';

export interface HolidayPeriod {
    start: string; // ISO date
    end: string;   // ISO date
}

interface SettingsState {
    holidayMode: HolidayPeriod | null;
    loading: boolean;
    setHolidayMode: (period: HolidayPeriod | null) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => {
            let unsubscribe: () => void;

            const setupListener = (user: any) => {
                if (unsubscribe) unsubscribe();

                if (user) {
                    set({ loading: true });
                    const docRef = doc(db, 'user_settings', user.uid);
                    unsubscribe = onSnapshot(docRef, (snap) => {
                        if (snap.exists()) {
                            set({ holidayMode: snap.data().holidayMode || null, loading: false });
                        } else {
                            set({ holidayMode: null, loading: false });
                        }
                    });
                } else {
                    set({ holidayMode: null, loading: false });
                }
            };

            setupListener(useAuth.getState().user);
            useAuth.subscribe((state) => setupListener(state.user));

            return {
                holidayMode: null,
                loading: false,

                setHolidayMode: async (period) => {
                    const user = useAuth.getState().user;
                    if (!user) return;

                    const docRef = doc(db, 'user_settings', user.uid);
                    await setDoc(docRef, { holidayMode: period }, { merge: true });
                }
            };
        },
        {
            name: 'alfred-settings-storage',
            partialize: (state) => ({ holidayMode: state.holidayMode }),
        }
    )
);
