import { create } from 'zustand';
import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createPasskey, isPasskeySupported } from '../lib/passkeys';

interface AuthState {
    user: User | null;
    loading: boolean;
    isBiometricEnabled: boolean;
    isLocked: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    setUser: (user: User | null) => void;
    enableBiometrics: () => Promise<void>;
    unlock: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
    user: null,
    loading: true,
    isBiometricEnabled: localStorage.getItem('alfred_biometric_enabled') === 'true',
    isLocked: localStorage.getItem('alfred_biometric_enabled') === 'true',

    setUser: (user) => {
        set({
            user,
            loading: false,
            // Only lock if biometrics are enabled AND we have a user
            isLocked: (get().isBiometricEnabled && !!user)
        });
    },

    unlock: () => set({ isLocked: false }),

    enableBiometrics: async () => {
        const { user } = get();
        if (!user) return;

        try {
            if (!isPasskeySupported()) {
                throw new Error("Biometrics not supported here.");
            }

            await createPasskey(user.uid, user.email || user.displayName || "User");
            localStorage.setItem('alfred_biometric_enabled', 'true');
            set({ isBiometricEnabled: true, isLocked: false });
        } catch (error) {
            console.error('Failed to enable biometrics:', error);
            throw error;
        }
    },

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
            localStorage.removeItem('alfred_biometric_enabled');
            set({ user: null, isBiometricEnabled: false, isLocked: false });
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }
}));

// Setup listener outside of hook to avoid multiple listeners
auth.onAuthStateChanged((user) => {
    useAuth.getState().setUser(user);
});
