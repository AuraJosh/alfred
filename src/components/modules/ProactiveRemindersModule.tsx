import React, { useEffect } from 'react';
import { useAIStore } from '../../hooks/useAIStore';
import { Bell, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export const ProactiveRemindersModule: React.FC = () => {
    const { reminders, generateReminders, loading, apiKey } = useAIStore();

    useEffect(() => {
        const today = format(new Date(), 'yyyy-MM-dd');
        if (apiKey && (!reminders || reminders.date !== today)) {
            generateReminders();
        }
    }, [apiKey]);

    if (!apiKey || (!reminders && !loading)) return null;

    return (
        <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <div className="bg-amber-500/10 p-1.5 rounded-lg">
                        <Bell className="w-4 h-4 text-amber-500" />
                    </div>
                    <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">Neural Directives</h3>
                </div>
                <button 
                    onClick={() => generateReminders()} 
                    disabled={loading}
                    className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-900"
                    title="Refresh Reminders"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {loading && !reminders ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-16 bg-zinc-900/50 border border-zinc-800 rounded-xl animate-pulse" />
                    ))
                ) : (
                    reminders?.items.map((item, i) => {
                        const isHighPriority = item.toLowerCase().includes('days') || item.toLowerCase().includes('priority');
                        
                        return (
                            <div 
                                key={i} 
                                className="group flex items-center gap-3 p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl hover:bg-zinc-900 transition-all hover:border-zinc-700/50 relative overflow-hidden shadow-sm"
                            >
                                <div className={`shrink-0 w-1.5 h-8 rounded-full ${isHighPriority ? 'bg-amber-500' : 'bg-indigo-500/50'}`} />
                                
                                <div className="flex-1">
                                    <p className="text-sm text-zinc-300 font-medium leading-relaxed group-hover:text-zinc-100 transition-colors">
                                        {item}
                                    </p>
                                </div>

                                {isHighPriority ? (
                                    <AlertCircle className="w-4 h-4 text-amber-500/30 group-hover:text-amber-500/60 transition-colors" />
                                ) : (
                                    <Sparkles className="w-4 h-4 text-indigo-500/20 group-hover:text-indigo-500/50 transition-colors" />
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {reminders?.items.length === 0 && !loading && (
                <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
                    <Sparkles className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500 italic">No directives found. Your execution is currently optimal, Master Wayne.</p>
                </div>
            )}
        </div>
    );
};
