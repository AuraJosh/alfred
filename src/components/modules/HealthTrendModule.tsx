import React from 'react';
import { ShieldAlert, Thermometer, Heart, Wind, Activity, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { useWithingsStore } from '../../hooks/useWithingsStore';


export const HealthTrendModule: React.FC = () => {
    const { isConnected, sleepData, weeklySleepData, vitals, weeklyVitals } = useWithingsStore();

    if (!isConnected || !sleepData) return null;

    // --- LOGIC: 14-Day Baseline Comparisons with Standard Deviation ---
    const historicalSleep = weeklySleepData.slice(0, -1); // All days except today
    const historicalVitals = weeklyVitals.slice(0, -1);

    const getStats = (arr: any[], key: string) => {
        const values = arr.map(item => item[key]).filter(v => typeof v === 'number' && v > 0);
        if (values.length === 0) return { avg: 0, sd: 0 };
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
        const sd = Math.sqrt(avgSquareDiff);
        return { avg, sd };
    };

    // Baselines (14-day Rolling Window)
    const statsRHR = getStats(historicalSleep, 'resting_hr');
    const statsHRV = getStats(historicalSleep, 'hrv');
    const statsResp = getStats(historicalSleep, 'respiration_rate');
    const statsTemp = getStats(historicalVitals, 'temp');

    // Default fallbacks if data is sparse
    const baselineRHR = statsRHR.avg || 60;
    const baselineHRV = statsHRV.avg || 40;
    const baselineResp = statsResp.avg || 14;
    const baselineTemp = statsTemp.avg || 36.5;

    // Today's values (prefer latest vitals for temp/rhr if available, else sleep average)
    const currentTemp = vitals?.temp || baselineTemp;
    const currentRHR = vitals?.rhr || sleepData.resting_hr || baselineRHR;
    const currentHRV = sleepData.hrv || baselineHRV;
    const currentResp = sleepData.respiration_rate || baselineResp;

    // Deviations
    const tempDiff = currentTemp - baselineTemp;
    const rhrDiff = currentRHR - baselineRHR;
    const hrvDiff = baselineHRV - currentHRV; // Drop is positive
    const respDiff = currentResp - baselineResp;

    // Flagging Logic (Standard Deviation Thresholds)
    const flags = {
        temp: tempDiff > 0.5, // Overnight Temperature Fluctuation (VIP)
        rhr: rhrDiff > (statsRHR.sd * 1.5 || 5), // > 1.5 SD above
        hrv: hrvDiff > (statsHRV.sd * 1.5 || 10), // > 1.5 SD below (hrvDiff is drop)
        resp: respDiff > (statsResp.sd * 1.0 || 2) // > 1.0 SD above
    };

    const activeFlags = Object.values(flags).filter(Boolean).length;

    // Sickness Score Level
    let level = {
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
        status: 'Optimal Baseline',
        insight: 'Your biological markers are within their 14-day standard deviation. Your recovery is stabilized.'
    };

    if (activeFlags === 1) {
        level = {
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
            status: 'System Stress Detected',
            insight: `One biological marker (${Object.keys(flags).find(k => (flags as any)[k])}) is deviating. Likely overtraining, poor sleep, or early-stage immune response.`
        };
    } else if (activeFlags >= 2) {
        const isCritical = activeFlags >= 3 || flags.temp;
        level = {
            color: isCritical ? 'text-red-500' : 'text-orange-500',
            bg: isCritical ? 'bg-red-500/10' : 'bg-orange-500/10',
            border: isCritical ? 'border-red-500/20' : 'border-orange-500/20',
            icon: isCritical ? <AlertCircle className="w-6 h-6 text-red-500" /> : <ShieldAlert className="w-6 h-6 text-orange-500" />,
            status: isCritical ? 'High Illness Probability' : 'Immune Warning',
            insight: isCritical 
                ? 'Multiple critical thresholds breached, including body temperature. High probability of fever or infection. Monitor symptoms closely.'
                : 'Multiple biological markers have breached their safety thresholds. Your immune system is under significant strain. Prioritize rest.'
        };
    }

    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 mt-6 relative overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <h2 className="text-lg font-bold text-zinc-100">Immune & Sickness Detection</h2>
            </div>

            <div className={`p-4 rounded-xl border ${level.border} ${level.bg} mb-6 flex items-start gap-4 transition-all duration-500`}>
                <div className="mt-1">{level.icon}</div>
                <div>
                    <h3 className={`font-bold ${level.color} text-lg mb-1`}>{level.status}</h3>
                    <p className="text-zinc-300 text-sm leading-relaxed">{level.insight}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Temperature Card */}
                <div className={`bg-zinc-900 border ${flags.temp ? 'border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-zinc-800'} rounded-xl p-3 transition-all`}>
                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                        <Thermometer className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Body Temp</span>
                    </div>
                    <div className="flex items-end gap-1 mb-1">
                        <span className={`text-xl font-bold tabular-nums ${flags.temp ? 'text-red-400' : 'text-zinc-100'}`}>
                            {currentTemp.toFixed(1)}°C
                        </span>
                    </div>
                    <div className={`text-[10px] font-medium ${tempDiff > 0 ? (flags.temp ? 'text-red-400' : 'text-amber-400') : 'text-emerald-400'}`}>
                        {tempDiff > 0 ? '+' : ''}{tempDiff.toFixed(2)}° vs baseline
                    </div>
                </div>

                {/* Resting HR Card */}
                <div className={`bg-zinc-900 border ${flags.rhr ? 'border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'border-zinc-800'} rounded-xl p-3 transition-all`}>
                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                        <Heart className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Resting HR</span>
                    </div>
                    <div className="flex items-end gap-1 mb-1">
                        <span className={`text-xl font-bold tabular-nums ${flags.rhr ? 'text-orange-400' : 'text-zinc-100'}`}>
                            {Math.round(currentRHR)} <span className="text-xs font-normal text-zinc-500">bpm</span>
                        </span>
                    </div>
                    <div className={`text-[10px] font-medium ${rhrDiff > 0 ? (flags.rhr ? 'text-orange-400' : 'text-amber-400') : 'text-emerald-400'}`}>
                        {rhrDiff > 0 ? '+' : ''}{Math.round(rhrDiff)} bpm vs baseline
                    </div>
                </div>

                {/* HRV Card */}
                <div className={`bg-zinc-900 border ${flags.hrv ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-zinc-800'} rounded-xl p-3 transition-all`}>
                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                        <Activity className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">HRV (RMSSD)</span>
                    </div>
                    <div className="flex items-end gap-1 mb-1">
                        <span className={`text-xl font-bold tabular-nums ${flags.hrv ? 'text-amber-400' : 'text-zinc-100'}`}>
                            {Math.round(currentHRV)} <span className="text-xs font-normal text-zinc-500">ms</span>
                        </span>
                    </div>
                    <div className={`text-[10px] font-medium ${flags.hrv ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {hrvDiff > 0 ? `-${Math.round(hrvDiff)} ms vs baseline` : 'Optimal'}
                    </div>
                </div>

                {/* Respiration Card */}
                <div className={`bg-zinc-900 border ${flags.resp ? 'border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'border-zinc-800'} rounded-xl p-3 transition-all`}>
                    <div className="flex items-center gap-2 text-zinc-500 mb-2">
                        <Wind className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Breathing Rate</span>
                    </div>
                    <div className="flex items-end gap-1 mb-1">
                        <span className={`text-xl font-bold tabular-nums ${flags.resp ? 'text-indigo-400' : 'text-zinc-100'}`}>
                            {currentResp.toFixed(1)} <span className="text-xs font-normal text-zinc-500">rpm</span>
                        </span>
                    </div>
                    <div className={`text-[10px] font-medium ${respDiff > 0 ? (flags.resp ? 'text-indigo-400' : 'text-amber-400') : 'text-emerald-400'}`}>
                        {respDiff > 0 ? '+' : ''}{respDiff.toFixed(1)} rpm vs baseline
                    </div>
                </div>
            </div>

            <div className="mt-6 flex items-center gap-4 py-2 border-t border-zinc-900">
                <p className="text-[10px] text-zinc-500 italic">
                    Trend analysis based on 14-day rolling average (Standard Deviation model). Withings ScanWatch Nova sensor data used.
                </p>
            </div>
        </div>
    );
};
