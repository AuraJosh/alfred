import React, { useState, useEffect } from 'react';
import { useStudyStore } from '../../hooks/useStudyStore';
import { BrainCircuit, PlayCircle, StopCircle, CheckCircle2, BarChart2, History } from 'lucide-react';
import { format, subDays, isSameDay, parseISO } from 'date-fns';
import { StudyChecklist } from './StudyChecklist';
import { StudyAnalyticsModal } from './StudyAnalyticsModal';
import { StudyHistoryModal } from './StudyHistoryModal';

const SUBJECTS = ["Maths", "General", "Business"];

export const StudyModule: React.FC = () => {
    const { sessions, addSession } = useStudyStore();

    // Timer State
    const [isTiming, setIsTiming] = useState(false);
    const [secondsElapsed, setSecondsElapsed] = useState(0);
    const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
    const [sessionNotes, setSessionNotes] = useState('');
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // Graph Data formatting (Last 7 Days total minutes)
    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));

    const chartData = last7Days.map(date => {
        const daySessions = sessions.filter(s => isSameDay(parseISO(s.timestamp), date));
        let totalMins = daySessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);

        // Add currently running session to today's graph
        if (isTiming && isSameDay(date, new Date())) {
            totalMins += secondsElapsed / 60;
        }

        return {
            date: format(date, 'MMM d'),
            minutes: Math.round(totalMins)
        };
    });

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isTiming) {
            interval = setInterval(() => {
                setSecondsElapsed(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTiming]);

    const handleToggleTimer = () => {
        if (isTiming) {
            // Stop and Save
            const minutes = secondsElapsed / 60;
            if (minutes > 0.1) { // Only save if more than 6 seconds studied
                addSession(selectedSubject, Number(minutes.toFixed(2)), sessionNotes.trim() || undefined);
            }
            setIsTiming(false);
            setSecondsElapsed(0);
            setSessionNotes('');
        } else {
            // Start
            setIsTiming(true);
        }
    };

    const formatTime = (totalSeconds: number) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        if (hrs > 0) return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate total minutes today
    const activeTodayMins = chartData[chartData.length - 1].minutes;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Timer Widget */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col justify-start relative">
                    {isTiming && <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 animate-pulse timer-pulse-bar" />}

                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <BrainCircuit className="w-5 h-5 text-amber-400" />
                            <h2 className="text-lg font-bold text-zinc-100">Deep Work</h2>
                        </div>

                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            disabled={isTiming}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 mb-6 disabled:opacity-50"
                        >
                            {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                        </select>

                        <div className="text-center py-6">
                            <div className={`text-6xl font-black tabular-nums transition-colors duration-300 ${isTiming ? 'text-amber-400' : 'text-zinc-300'}`}>
                                {formatTime(secondsElapsed)}
                            </div>
                        </div>

                        {/* Session Notes - Appears and is focused during timing */}
                        <div className={`transition-all duration-300 overflow-hidden ${isTiming ? 'max-h-48 opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                            <textarea
                                value={sessionNotes}
                                onChange={(e) => setSessionNotes(e.target.value)}
                                placeholder="What are you working on?"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 resize-y"
                                rows={3}
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleToggleTimer}
                        className={`w-full py-4 flex items-center justify-center gap-2 rounded-xl font-bold text-lg transition-all ${isTiming
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                            : 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/20'
                            }`}
                    >
                        {isTiming ? <StopCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                        {isTiming ? 'Stop & Save Session' : 'Start Focus Session'}
                    </button>
                </div>

                {/* Subject Checklist */}
                <StudyChecklist subject={selectedSubject} />
            </div>

            {/* Rounded-t-xl on Timer absolute bar */}
            <style>{`
            .timer-pulse-bar { border-top-left-radius: 0.75rem; border-top-right-radius: 0.75rem; }
        `}</style>

            {showAnalyticsModal && (
                <StudyAnalyticsModal
                    onClose={() => setShowAnalyticsModal(false)}
                    chartData={chartData}
                    activeTodayMins={activeTodayMins}
                />
            )}
            {showHistoryModal && (
                <StudyHistoryModal
                    sessions={sessions}
                    onClose={() => setShowHistoryModal(false)}
                />
            )}
            {/* Small Analytics & Recent Widget (lg:col-span-1) */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col h-full min-h-[400px]">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-purple-400" />
                        <h2 className="text-lg font-bold text-zinc-100">Analytics</h2>
                    </div>
                </div>

                {/* Today's Summary Card */}
                <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
                    <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Today</p>
                        <div className="text-3xl font-black text-purple-400">
                            {Math.floor(activeTodayMins / 60)}h {Math.floor(activeTodayMins % 60)}m
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAnalyticsModal(true)}
                        className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-purple-500/20"
                    >
                        View Graph
                    </button>
                </div>

                {/* Recent Session Log Mini-view */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Recent Sessions</h3>
                        <button
                            onClick={() => setShowHistoryModal(true)}
                            className="bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-zinc-700/50"
                        >
                            <History className="w-3.5 h-3.5" />
                            History
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                        {sessions.length === 0 && <span className="text-sm text-zinc-600 italic">No sessions logged yet.</span>}
                        {sessions.slice(-5).reverse().map(session => (
                            <div key={session.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 w-full">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                                        <p className="font-medium text-zinc-200 text-sm truncate">{session.subject}</p>
                                    </div>
                                    <p className="text-xs font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 shrink-0">{session.durationMinutes}m</p>
                                </div>
                                {session.notes && (
                                    <p className="text-xs text-zinc-500 mt-1 pl-6 italic break-words line-clamp-2">
                                        "{session.notes}"
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
