import React, { useState, useRef, useEffect } from 'react';
import { PenTool, Trash2, ChevronLeft, ChevronRight, Send, Clock } from 'lucide-react';
import { useScratchpadStore } from '../../hooks/useScratchpadStore';
import { useUI } from '../../context/UIContext';
import { format, subDays, addDays, isToday, isSameDay, parseISO } from 'date-fns';

export const ScratchpadModule: React.FC = () => {
    const { entries, addEntry, deleteEntry } = useScratchpadStore();
    const { addToast, showConfirm } = useUI();
    const [viewDate, setViewDate] = useState(new Date());
    const [input, setInput] = useState('');
    const listRef = useRef<HTMLDivElement>(null);
    const isViewingToday = isToday(viewDate);

    // Auto-scroll to bottom of list when entries change (only if viewing today)
    useEffect(() => {
        if (isViewingToday && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [entries.length, isViewingToday]);

    const activeEntries = entries.filter(e => isSameDay(parseISO(e.timestamp), viewDate));

    const handlePrevDay = () => setViewDate(prev => subDays(prev, 1));
    const handleNextDay = () => setViewDate(prev => addDays(prev, 1));
    const handleToday = () => setViewDate(new Date());

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // If viewing an older day, insert it at noon of that day, else current time
        const timestamp = isViewingToday ? new Date().toISOString() : (() => {
            const d = new Date(viewDate);
            d.setHours(12, 0, 0, 0);
            return d.toISOString();
        })();

        try {
            await addEntry(input.trim(), timestamp);
            setInput('');
            addToast("Note added to journal", "success");
        } catch (err) {
            addToast("Failed to save entry securely", "error");
        }
    };

    const handleDelete = (id: string) => {
        showConfirm({
            title: "Delete Entry?",
            message: "Are you sure you want to permanently delete this journal entry?",
            confirmText: "Delete",
            onConfirm: async () => {
                try {
                    await deleteEntry(id);
                    addToast("Entry deleted", "info");
                } catch (err) {
                    addToast("Failed to delete entry", "error");
                }
            }
        });
    };

    return (
        <div className="mt-8 flex flex-col min-h-[500px]">
            {/* Header: Date Navigation */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <PenTool className="w-6 h-6 text-indigo-400" />
                    <h1 className="text-2xl font-black text-white">Daily Journal</h1>
                </div>

                <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 shadow-md">
                    <button
                        onClick={handlePrevDay}
                        className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-md transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="w-32 text-center" onClick={handleToday}>
                        <p className="text-sm font-bold text-zinc-100 cursor-pointer hover:text-indigo-400 transition-colors">
                            {isViewingToday ? "Today" : format(viewDate, 'MMM do, yyyy')}
                        </p>
                    </div>
                    <button
                        onClick={handleNextDay}
                        disabled={isViewingToday}
                        className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:bg-transparent"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* List and Input View */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl flex-1 flex flex-col relative overflow-hidden shadow-2xl">
                <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent custom-scrollbar" ref={listRef}>
                    {activeEntries.length === 0 ? (
                        <div className="h-full w-full flex flex-col items-center justify-center text-zinc-500 min-h-[300px]">
                            <PenTool className="w-10 h-10 mb-3 opacity-20" />
                            <p className="text-sm font-medium">No journal entries for {isViewingToday ? 'today' : format(viewDate, 'MMM do')}.</p>
                            <p className="text-xs mt-1 text-zinc-600">Quickly jot down your thoughts, active tasks, or end-of-day recaps.</p>
                        </div>
                    ) : (
                        activeEntries.map((entry) => (
                            <div key={entry.id} className="group flex gap-4 w-full bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700/50 p-4 rounded-xl transition-colors relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/50 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex flex-col items-center gap-1 min-w-[65px] pt-1">
                                    <Clock className="w-3.5 h-3.5 text-zinc-600" />
                                    <span className="text-[10px] font-bold text-zinc-500 tabular-nums">
                                        {format(parseISO(entry.timestamp), 'HH:mm')}
                                    </span>
                                </div>
                                <div className="flex-1 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                    {entry.text}
                                </div>
                                <button
                                    onClick={() => handleDelete(entry.id)}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-400 transition-all shrink-0 self-start hover:bg-zinc-800 rounded-lg"
                                    title="Delete Entry"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-zinc-900 border-t border-zinc-800 shrink-0">
                    <form onSubmit={handleAdd} className="relative flex items-end">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAdd(e as any);
                                }
                            }}
                            placeholder={isViewingToday ? "Write a new journal entry... (Shift+Enter for new line)" : `Add an entry to ${format(viewDate, 'MMM do')}...`}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-14 py-3 min-h-[50px] max-h-[150px] text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600 resize-y scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent line-height-tight"
                            spellCheck="false"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="absolute right-2 bottom-2 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-lg transition-colors cursor-pointer shadow-lg shadow-indigo-900/20"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
