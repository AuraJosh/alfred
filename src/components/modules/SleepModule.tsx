import React, { useEffect, useState } from 'react';
import { Moon, Activity, Plug, Star, Flame, LogOut, RefreshCw, X, Info } from 'lucide-react';
import { useWithingsStore } from '../../hooks/useWithingsStore';
import { useUI } from '../../context/UIContext';

export const SleepModule: React.FC = () => {
    const { isConnected, loading, hasChecked, sleepData, weeklySleepData, connect, disconnect, fetchSleepData, fetchWorkoutData, fetchVitalData, fetchIntradayHR, checkConnection } = useWithingsStore();
    const { showConfirm } = useUI();
    const [showReadinessModal, setShowReadinessModal] = useState(false);

    useEffect(() => {
        if (!hasChecked) {
            checkConnection().then(() => {
                const state = useWithingsStore.getState();
                if (state.isConnected) {
                    state.fetchSleepData();
                    state.fetchWorkoutData();
                    state.fetchVitalData();
                    state.fetchIntradayHR();
                }
            });
        }
    }, [hasChecked, checkConnection, fetchSleepData]);

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    const calculateReadiness = () => {
        if (!weeklySleepData || weeklySleepData.length === 0) return null;

        const sortedData = [...weeklySleepData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (sortedData.length === 0) return null;

        // Establish the user's RHR baseline
        const validRhr = sortedData.filter(d => d.resting_hr > 0).map(d => d.resting_hr);
        const baselineRhr = validRhr.length > 0 ? validRhr.reduce((a, b) => a + b, 0) / validRhr.length : 60;

        let readinessScore = 0;
        let recentScore = 0;
        let olderScore = 0;
        let rhrPenaltyCount = 0;
        let consistencyPenaltyCount = 0;

        const allScores = sortedData.map((d, index) => {
            let dailyScore = 0;

            // 1. Target Duration Component (40% weight) -> 7.5 Hours Target
            let durationScore = (d.duration / (7.5 * 3600)) * 100;
            if (durationScore > 100) durationScore = 100;
            dailyScore += durationScore * 0.40;

            // 2. Sleep Efficiency / Withings Quality Score (20% weight)
            // Withings provides `d.score` from 0-100 based on interruptions and phases
            dailyScore += (d.score || 0) * 0.20;

            // 3. Sleep Consistency (30% weight) -> Consistency vs the previous night tracked
            let consistencyScore = 100;
            if (index > 0) {
                const prevNight = sortedData[index - 1]; // Pulls from global array, fixing split bug
                const diffHours = Math.abs(d.duration - prevNight.duration) / 3600;
                if (diffHours > 1.5) {
                    consistencyScore = 50; // Heavily penalized for erratic sleep schedules
                    if (index >= sortedData.length - 3) consistencyPenaltyCount++;
                }
            }
            dailyScore += consistencyScore * 0.30;

            // 4. Resting Heart Rate Body Stress Component (10% weight)
            // If the user's RHR is elevated > 5 bpm over baseline, the body is under stress
            let rhrScore = 100;
            if (d.resting_hr > baselineRhr + 5) {
                rhrScore = 30; // Body is fighting an illness, overtrained, or stressed
                if (index >= sortedData.length - 3) rhrPenaltyCount++;
            } else if (d.resting_hr === 0) {
                // If no HR data, give them a neutral pass
                rhrScore = 100;
            }
            dailyScore += rhrScore * 0.10;

            // Attach score back to the object for diagnostic UI
            (d as any)._dailyScore = Math.round(dailyScore);

            return dailyScore;
        });

        const recentScores = allScores.slice(-3);
        const olderScores = allScores.slice(0, -3);

        recentScore = recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 0;
        olderScore = olderScores.length > 0 ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length : 0;

        if (olderScores.length > 0) {
            readinessScore = (recentScore * 0.70) + (olderScore * 0.30);
        } else {
            readinessScore = recentScore;
        }

        return {
            daysCount: weeklySleepData.length,
            readinessScore: Math.round(readinessScore),
            recentScore: Math.round(recentScore),
            olderScore: Math.round(olderScore),
            baselineRhr: Math.round(baselineRhr),
            rhrPenalties: rhrPenaltyCount,
            consistencyPenalties: consistencyPenaltyCount
        };
    };

    const readinessData = calculateReadiness();

    const handleDisconnect = () => {
        showConfirm({
            title: "Disconnect Withings",
            message: "Are you sure you want to disconnect your smartwatch?",
            confirmText: "Disconnect",
            onConfirm: disconnect
        });
    };

    return (
        <>
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 text-slate-50 relative z-10 w-full">
                <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl p-5 relative overflow-hidden shadow-2xl shadow-indigo-900/5">
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-2">
                            <Moon className="w-5 h-5 text-indigo-400" />
                            <h2 className="text-lg font-bold text-zinc-100">Sleep Dashboard</h2>
                        </div>
                        {isConnected && (
                            <div className="flex gap-2">
                                <button onClick={async () => {
                                    const state = useWithingsStore.getState();
                                    console.log("--- START WITHINGS TEST ---");
                                    try {
                                        await state.fetchSleepData();
                                        await state.fetchWorkoutData();
                                        await state.fetchVitalData();
                                        await state.fetchIntradayHR();
                                        console.log("Fetch Complete. Check logs above.");
                                    } catch (e) {
                                        console.error("Test Error:", e);
                                    }
                                    console.log("--- END WITHINGS TEST ---");
                                }} className="p-2 text-zinc-400 hover:text-amber-400 bg-zinc-900 border border-zinc-800 rounded-lg transition-colors" title="Debug API">
                                    <Activity className="w-4 h-4" />
                                </button>
                                <button onClick={() => { fetchSleepData(); fetchWorkoutData(); fetchVitalData(); fetchIntradayHR(); }} disabled={loading} className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors disabled:opacity-50" title="Refresh Data">
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                                <button onClick={handleDisconnect} className="p-2 text-zinc-400 hover:text-red-400 bg-zinc-900 border border-zinc-800 rounded-lg transition-colors" title="Disconnect Account">
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {!hasChecked ? (
                        <div className="py-12 flex justify-center items-center relative z-10">
                            <div className="w-8 h-8 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    ) : !isConnected ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/40 relative z-10">
                            <Activity className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-zinc-300 mb-2">Connect Your Smartwatch</h3>
                            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
                                Securely link your Withings account to automatically sync your nightly sleep duration, sleep scores, and recovery phases.
                            </p>
                            <button
                                onClick={connect}
                                className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-900/20"
                            >
                                <Plug className="w-4 h-4 mr-2" /> Connect Withings Account
                            </button>
                        </div>
                    ) : loading && !sleepData ? (
                        <div className="py-12 flex justify-center items-center relative z-10">
                            <div className="w-8 h-8 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    ) : !sleepData ? (
                        <div className="py-10 text-center border border-zinc-800 rounded-xl bg-zinc-900/50 relative z-10">
                            <Moon className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                            <p className="text-zinc-500 font-medium">No sleep data recorded yet for today.</p>
                            <p className="text-xs text-zinc-600 mt-1">Make sure you have synced your watch with the Withings app on your phone.</p>
                        </div>
                    ) : (
                        <div className="relative z-10">
                            <div className="flex items-end gap-3 mb-6">
                                <h3 className="text-4xl font-black text-zinc-100 tabular-nums tracking-tight">
                                    {formatDuration(sleepData.duration)}
                                </h3>
                                <span className="text-sm text-zinc-500 mb-1 font-medium">{sleepData.date}</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                                        <Star className="w-3.5 h-3.5 text-amber-500" /> Score
                                    </div>
                                    <div className="text-2xl font-bold text-zinc-100 tabular-nums">{sleepData.score}/100</div>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                                        <Moon className="w-3.5 h-3.5 text-indigo-400" /> Deep
                                    </div>
                                    <div className="text-2xl font-bold text-zinc-100 tabular-nums">{formatDuration(sleepData.deep)}</div>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                                        <Flame className="w-3.5 h-3.5 text-rose-400" /> REM
                                    </div>
                                    <div className="text-2xl font-bold text-zinc-100 tabular-nums">{formatDuration(sleepData.rem)}</div>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                                        <Activity className="w-3.5 h-3.5 text-emerald-400" /> Light
                                    </div>
                                    <div className="text-2xl font-bold text-zinc-100 tabular-nums">{formatDuration(sleepData.light)}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <Moon className="w-48 h-48" />
                    </div>
                </div>

                {isConnected && hasChecked && (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 relative overflow-hidden shadow-2xl shadow-indigo-900/5 flex flex-col justify-center items-center text-center">
                        <div className="absolute top-5 left-5 right-5 flex justify-between items-center z-20">
                            <h2 className="text-lg font-bold text-zinc-100">Daily Readiness</h2>
                            <button
                                onClick={() => setShowReadinessModal(true)}
                                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <Info className="w-5 h-5" />
                            </button>
                        </div>

                        {!readinessData ? (
                            <div className="flex flex-col items-center text-zinc-500 pt-8">
                                <Activity className="w-8 h-8 mb-2 opacity-50" />
                                <p className="text-sm">Not enough data yet</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center pt-10 w-full relative z-10">
                                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Overall Score</p>
                                <div className={`text-6xl font-black tabular-nums tracking-tight mb-2 ${readinessData.readinessScore >= 80 ? 'text-emerald-400' : readinessData.readinessScore >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                                    {readinessData.readinessScore}
                                </div>

                                <p className="text-[11px] text-zinc-500 max-w-[200px] leading-relaxed mt-2">
                                    Scored using a {readinessData.daysCount}-day rolling biological window. Click the info icon for your breakdown.
                                </p>
                            </div>
                        )}

                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                            <Activity className="w-32 h-32" />
                        </div>
                    </div>
                )}
            </div>

            {showReadinessModal && readinessData && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
                        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-indigo-400" />
                                <h3 className="font-bold text-zinc-100">Readiness Calculation</h3>
                            </div>
                            <button
                                onClick={() => setShowReadinessModal(false)}
                                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 text-sm text-zinc-300 overflow-y-auto max-h-[70vh]">
                            <div className={`p-4 rounded-xl border ${readinessData.readinessScore >= 80 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : readinessData.readinessScore >= 60 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                <h4 className="font-bold mb-1 flex items-center gap-2">
                                    <Star className="w-4 h-4" />
                                    {readinessData.readinessScore >= 80 ? 'Prime Readiness' : readinessData.readinessScore >= 60 ? 'Accumulated Fatigue' : 'Critical Systemic Debt'}
                                </h4>
                                <p className="text-xs opacity-90">
                                    {readinessData.readinessScore >= 80
                                        ? "Your systems are fully rebuilt. It is a green-light day for maximum physical and mental output."
                                        : readinessData.readinessScore >= 60
                                            ? "You are functional, but carrying fatigue. Aim for maintenance, not personal bests."
                                            : "Your biological reserves are dangerously low. Prioritize rest over all optional tasks today."}
                                </p>
                            </div>

                            <p className="leading-relaxed">
                                Your <strong className="text-white">Readiness Score ({readinessData.readinessScore})</strong> is not a simple average. It uses a biological pacing model weighted towards your immediate fatigue levels.
                            </p>

                            <div className="space-y-4">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">1. The 70/30 Recency Split</h4>
                                    <p className="mb-2">We analyze the last {readinessData.daysCount} days, but heavily prioritize your most recent sleep.</p>
                                    <ul className="list-disc list-inside text-zinc-400 space-y-1">
                                        <li>Last 3 Days Score: <strong className="text-white">{readinessData.recentScore}%</strong> <span className="text-indigo-400">(70% Weight)</span></li>
                                        <li>Prior {readinessData.daysCount - 3} Days Score: <strong className="text-white">{readinessData.olderScore}%</strong> <span className="text-indigo-400">(30% Weight)</span></li>
                                    </ul>
                                </div>

                                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">2. The Baseline</h4>
                                    <p>Your score is calculated against a hard biological requirement of <strong className="text-white">7.5 hours per night</strong>. Sleeping exactly 7.5 hours yields a raw score of 100.</p>
                                </div>

                                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">3. Body Stress (Resting HR)</h4>
                                    <p className="mb-2">We track your Resting Heart Rate to determine if your body is structurally stressed or fighting illness.</p>
                                    <ul className="list-disc list-inside text-zinc-400 space-y-1">
                                        <li>Your Baseline RHR: <strong className="text-white">{readinessData.baselineRhr} bpm</strong></li>
                                        <li>Penalty: Any night your RHR spikes 5+ beats above your baseline, your body is under stress.</li>
                                        <li>Recent Nights Spiking: <strong className="text-rose-400">{readinessData.rhrPenalties}</strong></li>
                                    </ul>
                                </div>

                                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">4. Data Diagnostic (Sleep Timeline)</h4>
                                    <div className="max-h-40 overflow-y-auto pr-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                                        {weeklySleepData && [...weeklySleepData].reverse().map((day) => (
                                            <div key={day.date} className="flex justify-between items-center py-1 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 px-2 rounded -mx-2 transition-colors">
                                                <span className="text-[10px] text-zinc-400 font-mono">{day.date}</span>
                                                <div className="flex gap-4">
                                                    <span className={`text-[10px] w-8 font-black ${(day as any)._dailyScore >= 80 ? 'text-emerald-400' : (day as any)._dailyScore >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                        {(day as any)._dailyScore}%
                                                    </span>
                                                    <span className="text-[10px] w-12 font-bold text-zinc-300">
                                                        {formatDuration(day.duration)}
                                                    </span>
                                                    <span className={`text-[10px] font-bold ${day.resting_hr > 0 ? (day.resting_hr > readinessData.baselineRhr + 5 ? 'text-amber-400' : 'text-emerald-400') : 'text-zinc-600'}`}>
                                                        {day.resting_hr > 0 ? `${day.resting_hr} bpm` : 'No HR Data'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
