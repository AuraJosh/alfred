import React from 'react';
import { ShieldAlert, Thermometer, Heart, Wind, Activity, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { useWithingsStore } from '../../hooks/useWithingsStore';


export const HealthTrendModule: React.FC = () => {
    const { isConnected, sleepData, weeklySleepData, vitals, weeklyVitals } = useWithingsStore();

    if (!isConnected || !sleepData) return null;

    // --- LOGIC: Baseline Comparisons ---
    const last7Days = weeklySleepData.slice(-8, -1); // Last 7 days excluding today
    const last7Vitals = weeklyVitals.slice(-8, -1);

    const getAverage = (arr: any[], key: string) => {
        const values = arr.map(item => item[key]).filter(v => v > 0);
        if (values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    };

    // Baselines
    const baselineRHR = getAverage(last7Days, 'resting_hr') || getAverage(last7Vitals, 'rhr') || 60;
    const baselineHRV = getAverage(last7Days, 'hrv') || 40;
    const baselineResp = getAverage(last7Days, 'respiration_rate') || 14;
    const baselineTemp = getAverage(last7Vitals, 'temp') || 36.5;

    // Today's values (prefer vitals for temp/rhr if available, else sleep)
    const currentTemp = vitals?.temp || baselineTemp;
    const currentRHR = vitals?.rhr || sleepData.resting_hr || baselineRHR;
    const currentHRV = sleepData.hrv || baselineHRV;
    const currentResp = sleepData.respiration_rate || baselineResp;

    // Deviations
    const tempDiff = currentTemp - baselineTemp;
    const rhrDiff = currentRHR - baselineRHR;
    const hrvDropPercent = baselineHRV > 0 ? ((baselineHRV - currentHRV) / baselineHRV) * 100 : 0;
    const respDiff = currentResp - baselineResp;

    // Flagging
    const flags = {
        temp: tempDiff > 0.5,
        rhr: rhrDiff > 5,
        hrv: hrvDropPercent > 20,
        resp: respDiff > 2
    };

    const activeFlags = Object.values(flags).filter(Boolean).length;

    // Sickness Score Level
    let level = {
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
        status: 'Optimal Baseline',
        insight: 'Your vitals are within their normal rolling range. Your recovery is on track.'
    };

    if (activeFlags === 1) {
        level = {
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
            status: 'Yellow: System Strain',
            insight: 'One vital metric is deviating. You might be overtrained, stressed, or entering a pre-fever phase. Consider lighter activity.'
        };
    } else if (activeFlags === 2) {
        level = {
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/20',
            icon: <ShieldAlert className="w-6 h-6 text-orange-500" />,
            status: 'Orange: Immune Warning',
            insight: 'Multiple metrics are out of bounds. Immune system is under significant strain. Prioritize hydration and sleep.'
        };
    } else if (activeFlags >= 3) {
        level = {
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            icon: <AlertCircle className="w-6 h-6 text-red-500" />,
            status: 'Red: High Illness Probablity',
            insight: 'Severe deviations detected across temperature and recovery metrics. High probability of fever or infection. Monitor closely.'
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
                        {hrvDropPercent > 0 ? (hrvDropPercent.toFixed(0) + '% drop') : 'Optimal'}
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
                    Trend analysis based on 7-day rolling average. Withings ScanWatch Nova sensor data used.
                </p>
            </div>
        </div>
    );
};
