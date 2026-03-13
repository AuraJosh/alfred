import React, { useState } from 'react';
import { Shield, Brain, Zap, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Info, Activity, Clock } from 'lucide-react';
import { useWithingsStore } from '../../hooks/useWithingsStore';
import { format, parseISO } from 'date-fns';

export const ThreePillarsModule: React.FC = () => {
    const { isConnected, sleepData, weeklySleepData, weeklyVitals, intradayHR } = useWithingsStore();
    const [isOpen, setIsOpen] = useState(false);

    if (!isConnected || !sleepData || weeklySleepData.length < 3) return null;

    // --- Helper for Baselines ---
    const get7DayAverage = (arr: any[], key: string) => {
        const values = arr.slice(-8, -1).map(item => item[key]).filter(v => v > 0);
        if (values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    };

    // 1. IMMUNE FIREWALL LOGIC
    const baselineTemp = get7DayAverage(weeklyVitals, 'temp') || 36.5;
    const baselineResp = get7DayAverage(weeklySleepData, 'respiration_rate') || 14;

    const checkImmuneFlag = (dayIndex: number) => {
        const day = weeklySleepData[dayIndex];
        const vitalDay = weeklyVitals.find(v => v.date === day.date);
        if (!day || !vitalDay) return false;
        
        const temp = vitalDay.temp || baselineTemp;
        const resp = day.respiration_rate || baselineResp;
        
        return (temp - baselineTemp > 0.5) && (resp - baselineResp > 2);
    };

    const immuneWarning = checkImmuneFlag(weeklySleepData.length - 1) && checkImmuneFlag(weeklySleepData.length - 2);

    // 2. COGNITIVE GAS TANK LOGIC
    const baselineHRV = get7DayAverage(weeklySleepData, 'hrv') || 40;
    const lowHRV = sleepData.hrv < baselineHRV;
    const lowREM = sleepData.rem < 5400; // 90 mins in seconds
    const brainDrain = lowHRV && lowREM;

    // 3. STRESS MAP LOGIC (Intraday HR spikes)
    const stressSpikes = intradayHR.filter(h => h.hr > 100).sort((a, b) => b.hr - a.hr).slice(0, 5);

    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl mt-6 overflow-hidden shadow-2xl transition-all duration-300">
            {/* Header / Toggle */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-5 hover:bg-zinc-900 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
                        <Zap className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                            The Three Pillars
                            {(immuneWarning || brainDrain) && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                        </h2>
                        <p className="text-xs text-zinc-500 font-medium">Predictive Bio-Telemetry & Stress Mapping</p>
                    </div>
                </div>
                {isOpen ? <ChevronUp className="w-5 h-5 text-zinc-600" /> : <ChevronDown className="w-5 h-5 text-zinc-600" />}
            </button>

            {isOpen && (
                <div className="p-6 pt-0 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    
                    {/* Pillar 1: Immune Firewall */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 group relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Shield className={`w-5 h-5 ${immuneWarning ? 'text-red-500' : 'text-emerald-400'}`} />
                                <h3 className="font-bold text-zinc-100">Immune Firewall</h3>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${immuneWarning ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                {immuneWarning ? 'Threat Detected' : 'Shields Up'}
                            </span>
                        </div>
                        
                        {immuneWarning ? (
                            <div className="flex gap-4 items-start">
                                <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-red-400">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-300 font-bold mb-1">Pre-Flu Pivot Detected</p>
                                    <p className="text-xs text-zinc-500 leading-relaxed">
                                        Nightly temp and respiratory rate have spiked for 2 consecutive days. Your body is fighting an infection. Skip the gym and hydrate immediately.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-4 items-start">
                                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-emerald-400">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-300 font-bold mb-1">Viral Defence Optimal</p>
                                    <p className="text-xs text-zinc-500 leading-relaxed">
                                        No heat spikes or respiratory deviations detected in the "Pre-Fever" window. Your immune baseline is stable.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pillar 2: Cognitive Gas Tank */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Brain className={`w-5 h-5 ${brainDrain ? 'text-amber-500' : 'text-indigo-400'}`} />
                                <h3 className="font-bold text-zinc-100">Cognitive Gas Tank</h3>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${brainDrain ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                {brainDrain ? 'Fuel Low' : 'Engine Ready'}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-black/20 p-3 rounded-xl border border-zinc-800">
                                <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">HRV Resilience</p>
                                <p className={`text-sm font-bold ${lowHRV ? 'text-amber-400' : 'text-zinc-100'}`}>
                                    {Math.round(sleepData.hrv)}ms <span className="text-[10px] font-normal text-zinc-500">vs {Math.round(baselineHRV)}ms avg</span>
                                </p>
                            </div>
                            <div className="bg-black/20 p-3 rounded-xl border border-zinc-800">
                                <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">REM Recovery</p>
                                <p className={`text-sm font-bold ${lowREM ? 'text-amber-400' : 'text-zinc-100'}`}>
                                    {Math.round(sleepData.rem/60)}m <span className="text-[10px] font-normal text-zinc-500">vs 90m target</span>
                                </p>
                            </div>
                        </div>

                        {brainDrain && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-3">
                                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-amber-400 leading-normal">
                                    <span className="font-bold">Neural Protocol:</span> Low REM + suppressed HRV indicates mental depletion. Cap your "Daily To-Do List" at 3 high-impact items only today.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Pillar 3: Caffeine & Stress Map */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Zap className="w-5 h-5 text-amber-500" />
                                <h3 className="font-bold text-zinc-100">Stress & Caffeine Map</h3>
                            </div>
                            <span className="text-[10px] bg-zinc-800 text-zinc-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                                Live Tracking
                            </span>
                        </div>

                        {stressSpikes.length > 0 ? (
                            <div className="space-y-3">
                                {stressSpikes.map((spike, i) => (
                                    <div key={i} className="flex items-center justify-between bg-black/20 px-4 py-3 rounded-xl border border-zinc-800/50">
                                        <div className="flex items-center gap-3">
                                            <Activity className="w-4 h-4 text-red-400" />
                                            <div>
                                                <p className="text-xs font-bold text-zinc-200">Stress Surge: {Math.round(spike.hr)} BPM</p>
                                                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                                    <Clock className="w-3 h-3" />
                                                    {format(parseISO(spike.timestamp), 'HH:mm')} - Potential Cortisol Spike
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">
                                            Check Calendar
                                        </div>
                                    </div>
                                ))}
                                <p className="text-[10px] text-zinc-500 text-center italic mt-2">
                                    Compare these times with your meetings to identify high-stress triggers.
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-4 border-2 border-dashed border-zinc-800 rounded-xl">
                                <Zap className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                                <p className="text-xs text-zinc-500">No significant stress spikes detected in the last 12 hours.</p>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
};
