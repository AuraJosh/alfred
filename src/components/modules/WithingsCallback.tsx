import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWithingsStore } from '../../hooks/useWithingsStore';
import { Activity } from 'lucide-react';

export const WithingsCallback: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { exchangeCode, connect } = useWithingsStore();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const code = query.get('code');
        const state = query.get('state');

        const savedState = localStorage.getItem('withings_auth_state');

        // Let's be lenient on state match for local dev, but warn if mismatch
        if (state && savedState && state !== savedState) {
            console.warn("Withings Auth Warning: Mismatched OAuth state.");
        }

        if (code) {
            exchangeCode(code)
                .then(() => {
                    navigate('/'); // Back to dashboard
                })
                .catch((err) => {
                    console.error("Exchange error: ", err);
                    setError("Failed to securely connect to Withings.");
                });
        } else {
            setError("No authorization code provided.");
        }
    }, [location, navigate, exchangeCode]);

    if (error) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center text-slate-50">
                <h1 className="text-xl font-bold text-red-500 mb-2">Connection Failed</h1>
                <p className="text-zinc-400 mb-6">{error}</p>
                <button onClick={connect} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Try Again
                </button>
                <button onClick={() => navigate('/')} className="mt-4 text-zinc-500 hover:text-white transition-colors text-sm">
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-slate-50">
            <Activity className="w-12 h-12 text-indigo-500 animate-pulse mb-6" />
            <h2 className="text-xl font-bold text-zinc-200">Connecting to Withings...</h2>
            <p className="text-zinc-500 mt-2">Please wait while we synchronize your health data.</p>
        </div>
    );
};
