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
    initialize: () => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            holidayMode: null,
            loading: false,

            initialize: () => {
                let unsubscribe: (() => void) | null = null;
                let lastUserId: string | null = null;
                
                const setupListener = (user: any) => {
                    const currentUserId = user?.uid || null;
                    if (currentUserId === lastUserId) return;
                    lastUserId = currentUserId;

                    if (unsubscribe) {
                        unsubscribe();
                        unsubscribe = null;
                    }

                    if (user) {
                        set({ loading: true });
                        const docRef = doc(db, 'user_settings', user.uid);
                        unsubscribe = onSnapshot(docRef, (snap) => {
                            if (snap.exists()) {
                                set({ holidayMode: snap.data().holidayMode || null, loading: false });
                            } else {
                                set({ holidayMode: null, loading: false });
                            }
                        }, (error) => {
                            if (error.code !== 'permission-denied') {
                                console.error("Settings listener error:", error);
                            }
                            set({ loading: false });
                        });
                    } else {
                        set({ holidayMode: null, loading: false });
                    }
                };

                // Initial setup
                setupListener(useAuth.getState().user);
                
                // Watch for auth changes
                useAuth.subscribe((state) => setupListener(state.user));
            },

            setHolidayMode: async (period) => {
                const user = useAuth.getState().user;
                if (!user) return;

                // 1. Update local state immediately for instant UI feedback
                set({ holidayMode: period });

                // 2. Update Firestore
                const docRef = doc(db, 'user_settings', user.uid);
                await setDoc(docRef, { holidayMode: period }, { merge: true });
            }
        }),
        {
            name: 'alfred-settings-storage',
            partialize: (state) => ({ holidayMode: state.holidayMode }),
        }
    )
);

// Auto-initialize the store
useSettingsStore.getState().initialize();
