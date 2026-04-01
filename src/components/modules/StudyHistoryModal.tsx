import React, { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, Clock, BookOpen, FileText, Trash2 } from 'lucide-react';
import { format, subDays, addDays, isSameDay, parseISO } from 'date-fns';
import { useStudyStore } from '../../hooks/useStudyStore';
import type { StudySession } from '../../hooks/useStudyStore';
import { formatMinutes } from './StudyModule';

const SUBJECTS = ["Maths", "General", "Business"];

interface StudyHistoryModalProps {
    sessions: StudySession[];
    onClose: () => void;
}

export const StudyHistoryModal: React.FC<StudyHistoryModalProps> = ({ sessions, onClose }) => {
    const { updateSession, deleteSession } = useStudyStore();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));
    const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));
    const handleToday = () => setSelectedDate(new Date());

    const handleUpdateSubject = async (sessionId: string, newSubject: string) => {
        try {
            await updateSession(sessionId, { subject: newSubject });
        } catch (err) {
            console.error("Failed to update session subject", err);
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (window.confirm("Are you sure you want to delete this session?")) {
            try {
                await deleteSession(sessionId);
            } catch (err) {
                console.error("Failed to delete session", err);
            }
        }
    };

    // Get sessions for the selected day
    const daySessions = useMemo(() => {
        return sessions
            .filter(s => isSameDay(parseISO(s.timestamp), selectedDate))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [sessions, selectedDate]);

    const totalMinutes = daySessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 rounded-t-2xl shrink-0">
                    <div className="flex items-center gap-2 text-zinc-100">
                        <Calendar className="w-5 h-5 text-purple-400" />
                        <h2 className="font-bold">Study History</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Date Navigation */}
                <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900/20 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePrevDay}
                            className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors border border-zinc-800"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="text-center w-36">
                            <h3 className="text-base font-semibold text-zinc-100">
                                {format(selectedDate, 'MMM d, yyyy')}
                            </h3>
                            <p className="text-xs text-zinc-500">
                                {isSameDay(selectedDate, new Date()) ? 'Today' : format(selectedDate, 'EEEE')}
                            </p>
                        </div>
                        <button
                            onClick={handleNextDay}
                            disabled={isSameDay(selectedDate, new Date())}
                            className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors border border-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {!isSameDay(selectedDate, new Date()) && (
                        <button
                            onClick={handleToday}
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-purple-400 text-sm font-medium rounded-lg transition-colors border border-zinc-800"
                        >
                            Back to Today
                        </button>
                    )}
                </div>

                {/* Summary Row */}
                <div className="px-6 py-4 bg-zinc-900/10 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-lg border border-purple-500/20">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-bold">Total: {formatMinutes(totalMinutes)}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/20">
                            <BookOpen className="w-4 h-4" />
                            <span className="text-sm font-bold">{daySessions.length} Sessions</span>
                        </div>
                    </div>
                    <button
                        onClick={async () => {
                            const subject = prompt("Select Subject (Maths, General, Business):", "General");
                            if (subject && SUBJECTS.includes(subject)) {
                                const duration = prompt("Duration in minutes:", "30");
                                if (duration) {
                                    const mins = parseFloat(duration);
                                    if (!isNaN(mins) && mins > 0) {
                                        // Use the selected day's date but maybe with a default time
                                        const now = new Date();
                                        const sessionDate = new Date(selectedDate);
                                        sessionDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
                                        
                                        const { addSession } = useStudyStore.getState();
                                        await addSession(subject, mins, "Manual Entry", undefined, sessionDate.toISOString());
                                    }
                                }
                            }
                        }}
                        className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
                    >
                        <Clock className="w-3.5 h-3.5" />
                        Log Manual Session
                    </button>
                </div>

                {/* Sessions List */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {daySessions.length === 0 ? (
                        <div className="text-center py-12 bg-zinc-900/30 rounded-xl border border-zinc-800/50 border-dashed">
                            <Clock className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                            <p className="text-zinc-400">No study sessions logged on this day.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {daySessions.map((session) => (
                                <div key={session.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 transition-all hover:bg-zinc-800/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                                            <select
                                                value={session.subject}
                                                onChange={(e) => handleUpdateSubject(session.id, e.target.value)}
                                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:border-purple-500 font-semibold"
                                            >
                                                {SUBJECTS.map(sub => (
                                                    <option key={sub} value={sub}>{sub}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col items-end gap-1">
                                                <input
                                                    type="datetime-local"
                                                    defaultValue={format(parseISO(session.timestamp), "yyyy-MM-dd'T'HH:mm")}
                                                    onChange={async (e) => {
                                                        const newDate = new Date(e.target.value).toISOString();
                                                        await updateSession(session.id, { timestamp: newDate });
                                                    }}
                                                    className="bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 focus:outline-none focus:border-purple-500/50 cursor-pointer"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <div className="relative group/dur">
                                                        <input
                                                            type="number"
                                                            defaultValue={Math.round(session.durationMinutes)}
                                                            onBlur={async (e) => {
                                                                const val = parseFloat(e.target.value);
                                                                if (!isNaN(val) && val >= 0) {
                                                                    await updateSession(session.id, { durationMinutes: val });
                                                                }
                                                            }}
                                                            className="w-16 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm font-mono font-bold text-zinc-300 focus:outline-none focus:border-purple-500"
                                                        />
                                                        <span className="text-[10px] text-zinc-600 absolute -right-6 top-1/2 -translate-y-1/2">min</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteSession(session.id)}
                                                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                                                        title="Delete Session"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {session.notes && (
                                        <div className="mt-3 pl-4 border-l-2 border-zinc-800">
                                            <p className="text-sm text-zinc-400 flex items-start gap-2">
                                                <FileText className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                                                <span className="italic leading-relaxed">"{session.notes}"</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
