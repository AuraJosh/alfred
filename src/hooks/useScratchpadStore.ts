import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ScratchpadEntry {
    id: string;
    text: string;
    timestamp: string;
}

interface ScratchpadState {
    entries: ScratchpadEntry[];
    addEntry: (text: string, timestamp?: string) => void;
    deleteEntry: (id: string) => void;
    clearAll: () => void;
}

export const useScratchpadStore = create<ScratchpadState>()(
    persist(
        (set) => ({
            entries: [],
            addEntry: (text, timestamp) => set((state) => ({
                entries: [...state.entries, {
                    id: crypto.randomUUID(),
                    text,
                    timestamp: timestamp || new Date().toISOString()
                }]
            })),
            deleteEntry: (id) => set((state) => ({
                entries: state.entries.filter(e => e.id !== id)
            })),
            clearAll: () => set({ entries: [] }),
        }),
        {
            name: 'alfred-scratchpad-storage-v2', // bump version to bust old cache
        }
    )
);
