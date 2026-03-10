import { create } from 'zustand';
import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthState {
    user: User | null;
    loading: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    setUser: (user: User | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
    user: null,
    loading: true,
    setUser: (user) => set({ user, loading: false }),
    signIn: async () => {
        try {
            const provider = new GoogleAuthProvider();
            set({ loading: true });
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error('Error signing in:', error);
            set({ loading: false });
        }
    },
    signOut: async () => {
        try {
            await firebaseSignOut(auth);
            set({ user: null });
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }
}));

// Setup listener outside of hook to avoid multiple listeners
auth.onAuthStateChanged((user) => {
    useAuth.getState().setUser(user);
});
