import { useAuth } from '../hooks/useAuth';
import { LogIn, Coffee } from 'lucide-react';

export const Login: React.FC = () => {
    const { signIn, loading } = useAuth();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-zinc-950 text-slate-50">
            <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-zinc-800 rounded-full border border-zinc-700 flex items-center justify-center mb-6">
                    <Coffee className="w-8 h-8 text-zinc-300" />
                </div>
                <h1 className="text-4xl font-bold mb-2 tracking-tight">Alfred</h1>
                <p className="text-zinc-400 mb-8">At your service. Track your life, friction-free.</p>

                <button
                    onClick={signIn}
                    disabled={loading}
                    className="flex items-center justify-center w-full py-3 px-4 bg-zinc-50 hover:bg-zinc-200 text-zinc-950 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <LogIn className="w-5 h-5 mr-2" />
                    {loading ? 'Connecting...' : 'Sign in with Google'}
                </button>
            </div>
        </div>
    );
};
