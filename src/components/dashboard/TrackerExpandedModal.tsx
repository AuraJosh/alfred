import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subDays, addDays, isSameDay, isToday } from 'date-fns';
import type { Tracker, LogEntry } from '../../types';

interface TrackerExpandedModalProps {
    tracker: Tracker;
    logs: LogEntry[];
    onClose: () => void;
}

export const TrackerExpandedModal: React.FC<TrackerExpandedModalProps> = ({ tracker, logs, onClose }) => {
    const [viewDate, setViewDate] = useState(new Date());

    const handlePrev = () => setViewDate(prev => subDays(prev, 1));
    const handleNext = () => setViewDate(prev => addDays(prev, 1));

    // Get logs for the selected date
    const dayLogs = logs.filter(l => isSameDay(new Date(l.timestamp), viewDate));

    // Calculate display data based on tracker type
    let displayContent = null;
    let summaryText = "";

    if (tracker.type === 'DOUBLE_BOOLEAN') {
        const morningLog = dayLogs.find(l => l.value === 'morning');
        const nightLog = dayLogs.find(l => l.value === 'night');
        const hasMorning = !!morningLog;
        const hasNight = !!nightLog;
        const count = (hasMorning ? 1 : 0) + (hasNight ? 1 : 0);
        summaryText = `${count}/2 completed`;

        const label1 = tracker.labels?.[0] || 'Morning';
        const label2 = tracker.labels?.[1] || 'Night';

        displayContent = (
            <div className="flex justify-around mt-8">
                <div className="text-center w-1/2">
                    <p className="text-sm text-zinc-400 mb-2 truncate px-2" title={label1}>{label1}</p>
                    <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center border-2 text-xl font-bold mb-3 ${hasMorning ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-zinc-700 text-zinc-600 bg-zinc-800'}`}>
                        {hasMorning ? '✓' : '—'}
                    </div>
                    <p className="text-xs font-mono text-zinc-500">{hasMorning ? new Date(morningLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                </div>
                <div className="text-center w-1/2">
                    <p className="text-sm text-zinc-400 mb-2 truncate px-2" title={label2}>{label2}</p>
                    <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center border-2 text-xl font-bold mb-3 ${hasNight ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'border-zinc-700 text-zinc-600 bg-zinc-800'}`}>
                        {hasNight ? '✓' : '—'}
                    </div>
                    <p className="text-xs font-mono text-zinc-500">{hasNight ? new Date(nightLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                </div>
            </div>
        );
    } else if (tracker.type === 'COUNTER') {
        const sum = dayLogs.reduce((acc, l) => acc + (Number(l.value) || 0), 0);
        summaryText = `Total: ${sum}`;
        displayContent = (
            <div className="text-center mt-8 text-5xl font-black text-white">
                {sum}
            </div>
        );
    } else if (tracker.type === 'SCALAR' || tracker.type === 'RATING') {
        const val = dayLogs.length > 0 ? dayLogs[dayLogs.length - 1].value : '--';
        summaryText = dayLogs.length > 0 ? `Latest log` : `No logs`;
        displayContent = (
            <div className="text-center mt-8 text-5xl font-black text-white">
                {val}
            </div>
        );
    } else {
        const done = dayLogs.length > 0;
        summaryText = done ? 'Completed' : 'Missed';
        displayContent = (
            <div className="text-center mt-8 text-4xl font-bold">
                {done ? <span className="text-green-400">Done ✓</span> : <span className="text-zinc-600">Missed ✗</span>}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-sm p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-6 px-4">
                    <h2 className="text-xl font-bold text-zinc-100">{tracker.name}</h2>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">{tracker.category}</p>
                </div>

                <div className="flex items-center justify-between bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                    <button onClick={handlePrev} className="p-2 text-zinc-400 hover:text-white transition-colors bg-zinc-800 hover:bg-zinc-700 rounded">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="text-center flex-1">
                        <div className="font-semibold text-zinc-200">
                            {isToday(viewDate) ? 'Today' : format(viewDate, 'MMM do, yyyy')}
                        </div>
                        <div className="text-xs text-zinc-500">{summaryText}</div>
                    </div>
                    <button onClick={handleNext} disabled={isToday(viewDate)} className="p-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-30 bg-zinc-800 hover:bg-zinc-700 disabled:hover:bg-zinc-800 rounded">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="py-6">
                    {displayContent}
                </div>

                <div className="text-center text-xs text-zinc-600">
                    {tracker.type === 'DOUBLE_BOOLEAN' && <p>Logs are separated by its two routines.</p>}
                </div>
            </div>
        </div>
    );
};
