import React, { useState } from 'react';
import { Bot, Sparkles, KeyRound, Loader2, RotateCcw } from 'lucide-react';
import { useAIStore } from '../../hooks/useAIStore';
import { format } from 'date-fns';

export const IntelligenceModule: React.FC = () => {
    const { apiKey, setApiKey, insight, loading, error, generateInsight } = useAIStore();
    const [keyInput, setKeyInput] = useState("");
    const [showKeyInput, setShowKeyInput] = useState(!apiKey);

    const today = format(new Date(), 'yyyy-MM-dd');

    const handleSaveKey = (e: React.FormEvent) => {
        e.preventDefault();
        if (keyInput.trim()) {
            setApiKey(keyInput.trim());
            setShowKeyInput(false);
            setKeyInput("");
        }
    };

    return (
        <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">

                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transition-opacity duration-700 opacity-50 group-hover:opacity-100" />

                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                            <Bot className="w-5 h-5 text-amber-500" />
                        </div>
                        <h2 className="text-xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                            Daily Intelligence
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        {apiKey && !showKeyInput && (
                            <button
                                onClick={() => setShowKeyInput(true)}
                                className="text-xs text-zinc-500 hover:text-amber-500 transition-colors flex items-center gap-1 font-medium"
                            >
                                <KeyRound className="w-3 h-3" /> Update Key
                            </button>
                        )}
                    </div>
                </div>

                <div className="relative z-10">
                    {showKeyInput ? (
                        <div className="bg-black/40 border border-zinc-800/80 rounded-xl p-5 backdrop-blur-sm">
                            <h3 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-400" />
                                Local AI Engine Offline
                            </h3>
                            <p className="text-sm text-zinc-500 mb-4 leading-relaxed max-w-2xl">
                                To protect your privacy and wallet, Alfred processes your data entirely within your browser for free.
                                Secure a 100% free <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-amber-500 hover:underline">Google Gemini API Key</a> and paste it below. It will never leave this device.
                            </p>
                            <form onSubmit={handleSaveKey} className="flex gap-3 max-w-xl">
                                <div className="relative flex-1">
                                    <KeyRound className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="password"
                                        value={keyInput}
                                        onChange={(e) => setKeyInput(e.target.value)}
                                        placeholder="Paste your Gemini API key (AIzaSy...)"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!keyInput.trim()}
                                    className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:hover:bg-amber-600 px-6 rounded-lg text-white font-medium text-sm transition-colors shadow-lg shadow-amber-900/20"
                                >
                                    Activate
                                </button>
                                {apiKey && (
                                    <button
                                        type="button"
                                        onClick={() => setShowKeyInput(false)}
                                        className="px-4 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </form>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            {/* Insight Content Area */}
                            <div className="flex-1 bg-black/20 rounded-xl p-5 border border-zinc-800/50">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-6 text-zinc-500">
                                        <Loader2 className="w-6 h-6 animate-spin text-amber-500 mb-3" />
                                        <p className="text-sm animate-pulse">Analyzing neural telemetry...</p>
                                    </div>
                                ) : error ? (
                                    <div className="py-4 px-2">
                                        <p className="text-sm text-red-400 bg-red-400/10 px-4 py-3 rounded-lg border border-red-400/20">{error}</p>
                                    </div>
                                ) : insight?.date === today ? (
                                    <div className="animate-in fade-in duration-500">
                                        <p className="text-zinc-300 leading-relaxed text-[15px] font-medium tracking-wide whitespace-pre-wrap">
                                            {insight.text}
                                        </p>
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
                                                Generated Today from Live Data
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-zinc-500 text-center">
                                        <Sparkles className="w-8 h-8 text-zinc-700 mb-3" />
                                        <p className="text-sm font-medium text-zinc-400 mb-1">Briefing Ready</p>
                                        <p className="text-xs max-w-[250px]">
                                            Generate your personalized daily insight based on your latest sleep, workouts, and productivity.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Action Area */}
                            <div className="w-full md:w-auto flex flex-col gap-3 shrink-0">
                                <button
                                    onClick={generateInsight}
                                    disabled={loading || (insight?.date === today && !error)}
                                    className="w-full md:w-48 py-3 px-4 bg-zinc-100 hover:bg-white disabled:opacity-50 disabled:hover:bg-zinc-100 text-zinc-950 text-sm font-bold rounded-xl transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-2 group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                    {loading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                                    ) : insight?.date === today && !error ? (
                                        <><Bot className="w-4 h-4" /> Briefing Active</>
                                    ) : (
                                        <><Sparkles className="w-4 h-4" /> Generate Briefing</>
                                    )}
                                </button>

                                {insight?.date === today && (
                                    <button
                                        onClick={generateInsight}
                                        disabled={loading}
                                        className="w-full md:w-48 py-2 px-4 text-xs font-semibold text-zinc-500 hover:text-zinc-300 bg-zinc-900/50 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800/50 flex items-center justify-center gap-2"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Regenerate
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
