import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Fingerprint, Lock, LogOut } from 'lucide-react';
import { verifyPasskey } from '../../lib/passkeys';

export const BiometricLock: React.FC = () => {
    const { unlock, signOut, user } = useAuth();

    const handleUnlock = async () => {
        try {
            await verifyPasskey();
            unlock();
        } catch (err) {
            console.error("Biometric verification failed", err);
        }
    };

    // Auto-trigger on mount
    useEffect(() => {
        handleUnlock();
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Lock className="w-10 h-10 text-indigo-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Alfred is Locked</h1>
            <p className="text-zinc-400 mb-10 max-w-xs">
                {user ? `Welcome back, ${user.displayName?.split(' ')[0]}.` : "Please verify your identity to continue."}
            </p>

            <div className="flex flex-col gap-4 w-full max-w-xs">
                <button
                    onClick={handleUnlock}
                    className="flex items-center justify-center w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                    <Fingerprint className="w-6 h-6 mr-3" />
                    Use FaceID / TouchID
                </button>

                <button
                    onClick={signOut}
                    className="flex items-center justify-center w-full py-3 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout & Use Google instead
                </button>
            </div>
        </div>
    );
};
