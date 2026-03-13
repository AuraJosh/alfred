import React, { useState, useEffect, useCallback } from 'react';
import { useStudyStore } from '../../hooks/useStudyStore';
import { BrainCircuit, PlayCircle, StopCircle, PauseCircle, CheckCircle2, BarChart2, History } from 'lucide-react';
import { format, subDays, isSameDay, parseISO } from 'date-fns';
import { StudyChecklist } from './StudyChecklist';
import { StudyAnalyticsModal } from './StudyAnalyticsModal';
import { StudyHistoryModal } from './StudyHistoryModal';

const SUBJECTS = ["Maths", "General", "Business"];

type SessionPhase = 'idle' | 'running' | 'paused';

interface SessionEvent {
    type: 'start' | 'pause' | 'resume' | 'stop';
    time: number; // epoch ms
}

const LS_KEY = 'studySessionState_v2';

/** Sum up active (non-paused) milliseconds from a log of events */
function calcTotalActiveMs(events: SessionEvent[], nowMs?: number): number {
    let total = 0;
    let activeStart: number | null = null;

    for (const ev of events) {
        if (ev.type === 'start' || ev.type === 'resume') {
            activeStart = ev.time;
        } else if ((ev.type === 'pause' || ev.type === 'stop') && activeStart !== null) {
            total += ev.time - activeStart;
            activeStart = null;
        }
    }

    // Still running (no stop yet)
    if (activeStart !== null && nowMs !== undefined) {
        total += nowMs - activeStart;
    }

    return total;
}

/** Format ms → "Xh Ym Zs" or "Ym Zs" */
function formatDuration(ms: number): string {
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}

/** Format minutes → "Xh Ym" or "Ym" */
export function formatMinutes(mins: number): string {
    const hrs = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (hrs > 0) return m > 0 ? `${hrs}h ${m}m` : `${hrs}h`;
    return `${m}m`;
}

const EVENT_LABELS: Record<SessionEvent['type'], string> = {
    start: 'Session started',
    pause: 'Paused',
    resume: 'Resumed',
    stop: 'Session ended',
};

const EVENT_COLORS: Record<SessionEvent['type'], string> = {
    start: 'text-amber-400',
    pause: 'text-blue-400',
    resume: 'text-green-400',
    stop: 'text-red-400',
};

const EVENT_DOT_COLORS: Record<SessionEvent['type'], string> = {
    start: 'bg-amber-400',
    pause: 'bg-blue-400',
    resume: 'bg-green-400',
    stop: 'bg-red-400',
};

export const StudyModule: React.FC = () => {
    const { sessions, addSession } = useStudyStore();

    const [phase, setPhase] = useState<SessionPhase>('idle');
    const [events, setEvents] = useState<SessionEvent[]>([]);
    const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
    const [sessionNotes, setSessionNotes] = useState('');
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    // Live elapsed display — updated every second only, for the running phase
    const [liveMs, setLiveMs] = useState(0);

    // ── Restore from localStorage on mount ──────────────────────────────────
    useEffect(() => {
        const saved = localStorage.getItem(LS_KEY);
        if (!saved) return;
        try {
            const parsed = JSON.parse(saved);
            if (parsed.phase && parsed.events) {
                setPhase(parsed.phase);
                setEvents(parsed.events);
                if (parsed.selectedSubject) setSelectedSubject(parsed.selectedSubject);
                if (parsed.sessionNotes) setSessionNotes(parsed.sessionNotes);
            }
        } catch { /* ignore */ }
    }, []);

    // ── Persist to localStorage on change ───────────────────────────────────
    useEffect(() => {
        if (phase === 'idle') {
            localStorage.removeItem(LS_KEY);
        } else {
            localStorage.setItem(LS_KEY, JSON.stringify({ phase, events, selectedSubject, sessionNotes }));
        }
    }, [phase, events, selectedSubject, sessionNotes]);

    // ── Live elapsed ticker (runs only while active) ─────────────────────────
    useEffect(() => {
        if (phase !== 'running') {
            setLiveMs(calcTotalActiveMs(events));
            return;
        }
        const id = setInterval(() => {
            setLiveMs(calcTotalActiveMs(events, Date.now()));
        }, 1000);
        // Immediate update
        setLiveMs(calcTotalActiveMs(events, Date.now()));
        return () => clearInterval(id);
    }, [phase, events]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleStart = useCallback(() => {
        const now = Date.now();
        setEvents([{ type: 'start', time: now }]);
        setPhase('running');
    }, []);

    const handlePause = useCallback(() => {
        const now = Date.now();
        setEvents(prev => [...prev, { type: 'pause', time: now }]);
        setPhase('paused');
    }, []);

    const handleResume = useCallback(() => {
        const now = Date.now();
        setEvents(prev => [...prev, { type: 'resume', time: now }]);
        setPhase('running');
    }, []);

    const handleStop = useCallback(() => {
        const now = Date.now();
        const stopEvent: SessionEvent = { type: 'stop', time: now };
        const finalEvents = [...events, stopEvent];
        const totalMs = calcTotalActiveMs(finalEvents);
        const minutes = totalMs / 60000;

        if (minutes > 0.1) {
            addSession(selectedSubject, Number(minutes.toFixed(2)), sessionNotes.trim() || undefined, finalEvents);
        }

        setPhase('idle');
        setEvents([]);
        setSessionNotes('');
    }, [events, selectedSubject, sessionNotes, addSession]);

    // ── Graph data ────────────────────────────────────────────────────────────
    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
    const chartData = last7Days.map(date => {
        const daySessions = sessions.filter(s => isSameDay(parseISO(s.timestamp), date));
        let totalMins = daySessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);
        if (phase !== 'idle' && isSameDay(date, new Date())) {
            totalMins += liveMs / 60000;
        }
        return { date: format(date, 'MMM d'), minutes: Math.round(totalMins) };
    });
    const activeTodayMins = chartData[chartData.length - 1].minutes;

    const isActive = phase !== 'idle';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Deep Work Widget */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col justify-start relative overflow-hidden">
                    {/* Active pulse bar */}
                    {phase === 'running' && <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 animate-pulse timer-pulse-bar" />}
                    {phase === 'paused' && <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 timer-pulse-bar" />}

                    <div className="flex items-center gap-2 mb-4">
                        <BrainCircuit className="w-5 h-5 text-amber-400" />
                        <h2 className="text-lg font-bold text-zinc-100">Deep Work & Study v2</h2>
                    </div>

                    <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        disabled={isActive}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 mb-4 disabled:opacity-50"
                    >
                        {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>

                    {/* Live elapsed while running or paused */}
                    {isActive && (
                        <div className={`text-center py-4 transition-colors duration-300`}>
                            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                                {phase === 'paused' ? 'Active time (paused)' : 'Active time'}
                            </p>
                            <div className={`text-5xl font-black tabular-nums ${phase === 'running' ? 'text-amber-400' : 'text-blue-400'}`}>
                                {formatDuration(liveMs)}
                            </div>
                        </div>
                    )}

                    {/* Session Notes */}
                    <div className={`transition-all duration-300 overflow-hidden ${isActive ? 'max-h-48 opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                        <textarea
                            value={sessionNotes}
                            onChange={(e) => setSessionNotes(e.target.value)}
                            placeholder="What are you working on?"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 resize-y"
                            rows={3}
                        />
                    </div>

                    {/* ── Event log ── */}
                    {isActive && events.length > 0 && (
                        <div className="mb-4 space-y-1.5 border border-zinc-800 rounded-lg p-3 bg-zinc-900/50">
                            {events.map((ev, i) => (
                                <div key={i} className="flex items-center gap-2.5">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${EVENT_DOT_COLORS[ev.type]}`} />
                                    <span className={`text-xs font-semibold ${EVENT_COLORS[ev.type]}`}>
                                        {EVENT_LABELS[ev.type]}:
                                    </span>
                                    <span className="text-xs text-zinc-400 font-mono">
                                        {format(new Date(ev.time), 'EEE d MMM, HH:mm:ss')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Buttons ── */}
                    {phase === 'idle' && (
                        <button
                            onClick={handleStart}
                            className="w-full py-4 flex items-center justify-center gap-2 rounded-xl font-bold text-lg bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/20 transition-all"
                        >
                            <PlayCircle className="w-5 h-5" />
                            Start Focus Session
                        </button>
                    )}

                    {phase === 'running' && (
                        <button
                            onClick={handlePause}
                            className="w-full py-4 flex items-center justify-center gap-2 rounded-xl font-bold text-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/20 transition-all"
                        >
                            <PauseCircle className="w-5 h-5" />
                            Pause
                        </button>
                    )}

                    {phase === 'paused' && (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleResume}
                                className="py-4 flex items-center justify-center gap-2 rounded-xl font-bold text-base bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/20 transition-all"
                            >
                                <PlayCircle className="w-5 h-5" />
                                Resume
                            </button>
                            <button
                                onClick={handleStop}
                                className="py-4 flex items-center justify-center gap-2 rounded-xl font-bold text-base bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
                            >
                                <StopCircle className="w-5 h-5" />
                                Stop & Save
                            </button>
                        </div>
                    )}
                </div>

                {/* Subject Checklist */}
                <StudyChecklist subject={selectedSubject} />
            </div>

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

            {/* Analytics Widget */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col h-full min-h-[400px]">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-purple-400" />
                        <h2 className="text-lg font-bold text-zinc-100">Analytics</h2>
                    </div>
                </div>

                <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
                    <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Today</p>
                        <div className="text-3xl font-black text-purple-400">
                            {formatMinutes(activeTodayMins)}
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAnalyticsModal(true)}
                        className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-purple-500/20"
                    >
                        View Graph
                    </button>
                </div>

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
                        {[...sessions]
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .slice(0, 5)
                            .map(session => (
                            <div key={session.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 w-full">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                                        <p className="font-medium text-zinc-200 text-sm truncate">{session.subject}</p>
                                    </div>
                                    <p className="text-xs font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 shrink-0">{formatMinutes(session.durationMinutes)}</p>
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
