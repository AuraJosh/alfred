import React, { useState, useEffect } from 'react';
import { useGymStore } from '../../hooks/useGymStore';
import { useUI } from '../../context/UIContext';
import type { WorkoutSet } from '../../hooks/useGymStore';
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from 'recharts';
import { Dumbbell, Activity, CalendarDays, CheckCircle2, TrendingUp, Scale, ChevronLeft, ChevronRight, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { isSameDay, parseISO, addDays, subDays, format, isToday } from 'date-fns';

const SPLITS = ["Push (Chest, Shoulders, Triceps)", "Pull (Back, Biceps)", "Legs", "Full Body", "Cardio", "Other"];

const EXERCISES_BY_SPLIT: Record<string, string[]> = {
    "Push (Chest, Shoulders, Triceps)": [],
    "Pull (Back, Biceps)": [],
    "Legs": [],
    "Cardio": ["Skipping", "Running", "Cycling", "Swimming"],
    "Full Body": [],
    "Other": []
};

export const GymModule: React.FC = () => {
    const { workouts, addWorkout, deleteWorkout } = useGymStore();
    const { addToast, showConfirm } = useUI();

    // Date Navigation State
    const [viewDate, setViewDate] = useState(new Date());
    const isViewingToday = isToday(viewDate);

    // Session State
    const [selectedSplit, setSelectedSplit] = useState(SPLITS[0]);
    const [bodyWeight, setBodyWeight] = useState("");

    // Exercise State
    const pastExercisesForSplit = workouts.filter(w => w.split === selectedSplit).map(w => w.exercise);
    const availableExercises = Array.from(new Set([
        ...(EXERCISES_BY_SPLIT[selectedSplit] || []),
        ...pastExercisesForSplit
    ]));
    if (availableExercises.length === 0) availableExercises.push("Custom Exercise");

    const [selectedExercise, setSelectedExercise] = useState(availableExercises[0]);
    const [isCustomExercise, setIsCustomExercise] = useState(false);
    const [customExerciseName, setCustomExerciseName] = useState("");
    const [currentSets, setCurrentSets] = useState<WorkoutSet[]>([{ reps: 0, weight: 0, minutes: 0 }]);

    // Expanded Builder State
    const [isExpanded, setIsExpanded] = useState(false);

    // Progression graph state
    const [graphExercise, setGraphExercise] = useState(availableExercises[0]);

    useEffect(() => {
        setIsCustomExercise(false);
        setCustomExerciseName("");
        const firstEx = EXERCISES_BY_SPLIT[selectedSplit]?.[0] || "Custom Exercise";
        setSelectedExercise(firstEx);
        setGraphExercise(firstEx);
        setCurrentSets([{ reps: 0, weight: 0, minutes: 0 }]);
    }, [selectedSplit]);

    // Filter viewed session entries
    const sessionWorkouts = workouts.filter(w => isSameDay(parseISO(w.timestamp), viewDate));

    // Auto-infer session meta when viewing a date
    useEffect(() => {
        if (sessionWorkouts.length > 0) {
            const daySplit = sessionWorkouts[sessionWorkouts.length - 1].split;
            if (daySplit && SPLITS.includes(daySplit) && selectedSplit !== daySplit) {
                setSelectedSplit(daySplit);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workouts, viewDate]);

    const handlePrevDay = () => setViewDate(prev => subDays(prev, 1));
    const handleNextDay = () => setViewDate(prev => addDays(prev, 1));
    const handleToday = () => setViewDate(new Date());

    const handleAddWorkout = async () => {
        const finalExerciseName = isCustomExercise ? customExerciseName.trim() : selectedExercise;
        if (!finalExerciseName) return addToast("Please enter an exercise name.", "error");

        const isCardio = selectedSplit === "Cardio";
        const validSets = currentSets.filter(s =>
            isCardio ? (s.minutes && s.minutes > 0) : (s.reps && s.reps > 0 && s.weight && s.weight > 0)
        );

        if (validSets.length === 0) {
            return addToast(
                isCardio ? "Please enter valid minutes (> 0)." : "Please enter valid sets (both weight & reps > 0).",
                "error"
            );
        }

        const weightNum = parseFloat(bodyWeight);

        // If viewing a past date, log it for that exact day at noon, otherwise current time
        const timestamp = isViewingToday ? new Date().toISOString() : (() => {
            const d = new Date(viewDate);
            d.setHours(12, 0, 0, 0);
            return d.toISOString();
        })();

        await addWorkout(
            finalExerciseName,
            validSets,
            selectedSplit,
            isNaN(weightNum) ? undefined : weightNum,
            timestamp
        );

        setBodyWeight(""); // Reset body weight input after logging
        setCurrentSets([{ reps: 0, weight: 0, minutes: 0 }]); // reset sets
        setIsCustomExercise(false);
        setCustomExerciseName("");
        addToast(`Logged ${validSets.length} ${isCardio ? 'entry' : 'sets'} of ${finalExerciseName}!`, "success");
    };

    const handleSetChange = (index: number, field: keyof WorkoutSet, value: string) => {
        const newSets = [...currentSets];
        newSets[index] = { ...newSets[index], [field]: Number(value) };
        setCurrentSets(newSets);
    };

    const removeSet = (index: number) => {
        setCurrentSets(currentSets.filter((_, i) => i !== index));
    };

    const handleDeleteWorkout = async (id: string, exName: string) => {
        showConfirm({
            title: "Delete Exercise",
            message: `Are you sure you want to permanently delete your logged ${exName} from the database?`,
            confirmText: "Delete",
            onConfirm: async () => {
                await deleteWorkout(id);
                addToast(`Deleted ${exName}`, "success");
            }
        });
    };

    // Prepare chart data for the currently selected graph exercise
    const exerciseHistory = workouts
        .filter(w => w.exercise === graphExercise)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .reduce((acc, curr) => {
            const dateStr = new Date(curr.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const existing = acc.find(item => item.date === dateStr);
            if (existing) {
                if (curr.split === "Cardio") {
                    const sessionMinutes = curr.sets.reduce((sum, s) => sum + (s.minutes || 0), 0);
                    if (sessionMinutes > existing.repsMax) existing.repsMax = sessionMinutes;
                } else if (curr.oneRepMax && curr.oneRepMax > existing.repsMax) {
                    existing.repsMax = curr.oneRepMax;
                }
            } else {
                const sessionValue = curr.split === "Cardio"
                    ? curr.sets.reduce((sum, s) => sum + (s.minutes || 0), 0)
                    : (curr.oneRepMax || 0);
                acc.push({ date: dateStr, repsMax: sessionValue });
            }
            return acc;
        }, [] as { date: string, repsMax: number }[]);


    const InputForm = (
        <div className="flex flex-col relative h-full">
            <div className="flex items-center gap-2 mb-6 mt-1">
                <Dumbbell className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-zinc-100">Log Exercise</h2>
            </div>

            <div className="flex gap-4 mb-6">
                <div className="flex-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1.5 block">Workout Split</label>
                    <select
                        value={selectedSplit}
                        onChange={(e) => setSelectedSplit(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    >
                        {SPLITS.map(split => <option key={split} value={split}>{split}</option>)}
                    </select>
                </div>
                <div className="w-1/3">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Scale className="w-3 h-3" /> Body Wt</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={bodyWeight}
                            onChange={(e) => setBodyWeight(e.target.value)}
                            placeholder="0"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-8 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 tabular-nums"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">kg</span>
                    </div>
                </div>
            </div>

            <div className="border-t border-zinc-800/50 pt-6 flex-1 flex flex-col">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1.5 block">Target Exercise</label>
                <select
                    value={isCustomExercise ? "custom" : selectedExercise}
                    onChange={(e) => {
                        if (e.target.value === "custom") {
                            setIsCustomExercise(true);
                            setGraphExercise(customExerciseName.trim() || availableExercises[0]);
                        } else {
                            setIsCustomExercise(false);
                            setSelectedExercise(e.target.value);
                            setGraphExercise(e.target.value);
                        }
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 mb-4"
                >
                    {availableExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                    <option value="custom" className="text-emerald-400 font-bold">+ Add Custom Exercise...</option>
                </select>

                {isCustomExercise && (
                    <input
                        type="text"
                        placeholder="Enter custom exercise name"
                        value={customExerciseName}
                        onChange={(e) => {
                            setCustomExerciseName(e.target.value);
                            setGraphExercise(e.target.value);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 mb-4"
                        autoFocus
                    />
                )}

                <div className="space-y-3 mb-6 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {currentSets.map((set, i) => (
                        <div key={i} className="flex gap-3 items-center group">
                            <span className="text-zinc-500 text-xs font-mono font-medium w-8 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 text-center">{i + 1}</span>

                            {selectedSplit === "Cardio" ? (
                                <div className="flex-1 relative">
                                    <input
                                        type="number" placeholder="0" value={set.minutes || ''}
                                        onChange={(e) => handleSetChange(i, 'minutes', e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-12 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 tabular-nums"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">mins</span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 relative">
                                        <input
                                            type="number" placeholder="0" value={set.weight || ''}
                                            onChange={(e) => handleSetChange(i, 'weight', e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-8 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 tabular-nums"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">kg</span>
                                    </div>
                                    <span className="text-zinc-600 font-bold text-sm">×</span>
                                    <div className="flex-1 relative">
                                        <input
                                            type="number" placeholder="0" value={set.reps || ''}
                                            onChange={(e) => handleSetChange(i, 'reps', e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-8 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 tabular-nums"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">reps</span>
                                    </div>
                                </>
                            )}

                            {currentSets.length > 1 ? (
                                <button onClick={() => removeSet(i)} className="text-zinc-600 hover:text-red-400 p-1 transition-colors">
                                    ×
                                </button>
                            ) : (
                                <div className="w-5"></div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex gap-3 pt-4 border-t border-zinc-800/50 mt-auto">
                    <button
                        onClick={() => setCurrentSets([...currentSets, { reps: currentSets[currentSets.length - 1].reps, weight: currentSets[currentSets.length - 1].weight, minutes: currentSets[currentSets.length - 1].minutes }])}
                        className="flex-1 py-3 text-sm font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl transition-colors border border-zinc-800"
                    >
                        + Add Set
                    </button>
                    <button
                        onClick={handleAddWorkout}
                        className="flex-[2] py-3 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow-lg shadow-emerald-900/20"
                    >
                        Log Exercise
                    </button>
                </div>
            </div>
        </div>
    );

    const DetailedSessionList = () => {
        if (sessionWorkouts.length === 0) {
            return (
                <div className="py-12 text-center border border-dashed border-zinc-800 rounded-lg bg-zinc-900/30">
                    <Dumbbell className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500">No workout session found for {isViewingToday ? "today" : format(viewDate, 'MMM do')}.</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between bg-emerald-900/10 border border-emerald-500/20 rounded-lg p-4">
                    <div>
                        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Session Split</p>
                        <p className="text-md font-bold text-emerald-400">{sessionWorkouts[0].split || 'Unspecified'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Body Weight</p>
                        <p className="text-md font-bold text-emerald-400">{sessionWorkouts.find(w => w.bodyWeight)?.bodyWeight || '--'} kg</p>
                    </div>
                </div>

                <div className="space-y-6 mt-4">
                    {sessionWorkouts.map((w) => (
                        <div key={w.id} className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl overflow-hidden hover:border-emerald-500/30 transition-colors group relative">
                            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                                    <h3 className="font-bold text-zinc-100 text-lg">{w.exercise}</h3>
                                </div>
                                <div className="text-right">
                                    {w.split === 'Cardio' ? (
                                        <>
                                            <span className="text-xs text-zinc-500 uppercase tracking-wider block leading-none mb-1">Total Time</span>
                                            <span className="font-bold text-emerald-400 block tabular-nums leading-none">
                                                {w.sets.reduce((sum, s) => sum + (s.minutes || 0), 0)} mins
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-xs text-zinc-500 uppercase tracking-wider block leading-none mb-1">Max 1RM</span>
                                            <span className="font-bold text-emerald-400 block tabular-nums leading-none">{w.oneRepMax} kg</span>
                                        </>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDeleteWorkout(w.id, w.exercise)}
                                    title="Delete Exercise"
                                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-colors p-1 rounded bg-zinc-950/80 border border-zinc-800 backdrop-blur-sm shadow-xl"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-4">
                                <table className="w-full text-sm text-left text-zinc-400">
                                    <thead className="text-xs uppercase bg-transparent text-zinc-500 tracking-wider">
                                        <tr>
                                            <th className="px-2 py-2 w-16">Set</th>
                                            {w.split === 'Cardio' ? (
                                                <th className="px-2 py-2">Duration</th>
                                            ) : (
                                                <>
                                                    <th className="px-2 py-2">Weight</th>
                                                    <th className="px-2 py-2">Reps</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50">
                                        {w.sets.map((set, sIdx) => (
                                            <tr key={sIdx} className="hover:bg-zinc-800/30 font-medium text-zinc-200">
                                                <td className="px-2 py-2.5">
                                                    <span className="bg-zinc-800 text-zinc-400 rounded px-2 py-0.5 text-xs font-mono">{sIdx + 1}</span>
                                                </td>
                                                {w.split === 'Cardio' ? (
                                                    <td className="px-2 py-2.5 tabular-nums">
                                                        {set.minutes} <span className="text-zinc-500 text-xs">mins</span>
                                                    </td>
                                                ) : (
                                                    <>
                                                        <td className="px-2 py-2.5 tabular-nums">
                                                            {set.weight} <span className="text-zinc-500 text-xs">kg</span>
                                                        </td>
                                                        <td className="px-2 py-2.5 tabular-nums">
                                                            {set.reps} <span className="text-zinc-500 text-xs">x</span>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="mt-8">
            {/* Header: Date Navigation */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-2">
                    <Activity className="w-6 h-6 text-emerald-500" />
                    <h1 className="text-2xl font-black text-white">Workout Log</h1>
                </div>

                <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 shadow-md">
                    <button
                        onClick={handlePrevDay}
                        className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-md transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="w-32 text-center" onClick={handleToday}>
                        <p className="text-sm font-bold text-zinc-100 cursor-pointer hover:text-emerald-400 transition-colors">
                            {isViewingToday ? "Today" : format(viewDate, 'MMM do, yyyy')}
                        </p>
                    </div>
                    <button
                        onClick={handleNextDay}
                        disabled={isViewingToday}
                        className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:bg-transparent"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* EXPANDED MODAL OVERLAY */}
            {isExpanded && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col h-[90vh] overflow-hidden">

                        <div className="flex justify-between items-center p-5 border-b border-zinc-800 bg-zinc-900/40 shrink-0">
                            <div className="flex items-center gap-3">
                                <CalendarDays className="w-6 h-6 text-emerald-400" />
                                <h2 className="text-xl font-bold text-zinc-100">
                                    {isViewingToday ? "Today's " : `${format(viewDate, 'MMM do')} `} Workout Session
                                </h2>
                            </div>
                            <button onClick={() => setIsExpanded(false)} className="px-4 py-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors flex gap-2 items-center text-sm font-semibold">
                                <Minimize2 className="w-4 h-4" />
                                Close Builder
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
                            {/* Detailed List */}
                            <div className="col-span-1 lg:col-span-3 overflow-y-auto p-6 custom-scrollbar bg-zinc-950">
                                <h3 className="text-lg font-bold text-zinc-100 mb-6 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    Completed Exercises
                                </h3>
                                <DetailedSessionList />
                            </div>

                            {/* Input Form */}
                            <div className="col-span-1 lg:col-span-2 overflow-y-auto p-6 bg-zinc-950/50">
                                {InputForm}
                            </div>
                        </div>

                    </div>
                </div>
            )}


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Standard View Left side - The Input form */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col relative overflow-hidden min-h-[500px]">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-xl" />
                    {InputForm}
                </div>

                {/* Standard View Right side - Small Session Summary + Progression */}
                <div className="flex flex-col gap-6">
                    {/* Compact Session Summary */}
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col relative h-[300px]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-5 h-5 text-emerald-400" />
                                <h2 className="text-lg font-bold text-zinc-100 text-truncate">
                                    {isViewingToday ? "Today's" : format(viewDate, 'MMM do')} Summary
                                </h2>
                            </div>

                            <button
                                onClick={() => setIsExpanded(true)}
                                className="px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded-md transition-colors border border-emerald-500/20 flex gap-2 items-center"
                            >
                                <Maximize2 className="w-3 h-3" />
                                Expand Session
                            </button>
                        </div>

                        {sessionWorkouts.length > 0 ? (
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
                                {sessionWorkouts.map((w) => (
                                    <div key={w.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex justify-between items-center group relative overflow-hidden shrink-0">
                                        <div className="z-10 bg-zinc-900 pr-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                <span className="font-semibold text-sm text-zinc-200">{w.exercise}</span>
                                            </div>
                                            <p className="text-xs text-zinc-500 ml-6">
                                                {w.sets.length} sets logged
                                            </p>
                                        </div>
                                        <div className="text-right z-10 pl-2 bg-gradient-to-l from-zinc-900 via-zinc-900 to-transparent">
                                            {w.split === 'Cardio' ? (
                                                <div className="text-sm font-bold font-mono text-zinc-300">
                                                    {w.sets.reduce((sum, s) => sum + (s.minutes || 0), 0)} mins <span className="text-[10px] text-zinc-500 font-sans tracking-wide">TIME</span>
                                                </div>
                                            ) : (
                                                <div className="text-sm font-bold font-mono text-zinc-300">
                                                    {w.oneRepMax} kg <span className="text-[10px] text-zinc-500 font-sans tracking-wide">1RM</span>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleDeleteWorkout(w.id, w.exercise)}
                                            className="absolute right-0 top-0 bottom-0 px-4 bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center transform translate-x-full group-hover:translate-x-0 cursor-pointer"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center border border-dashed border-zinc-800 rounded-lg bg-zinc-900/30">
                                <Dumbbell className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                                <p className="text-sm text-zinc-500 px-4">No exercises logged for {isViewingToday ? 'today' : 'this date'}.</p>
                            </div>
                        )}
                    </div>

                    {/* Progression Chart */}
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col flex-1 min-h-[350px]">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                                <h2 className="text-lg font-bold text-zinc-100">Progression</h2>
                            </div>
                            <select
                                value={graphExercise}
                                onChange={(e) => setGraphExercise(e.target.value)}
                                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 flex-1 max-w-[150px] text-xs font-semibold text-zinc-300 focus:outline-none focus:border-emerald-500"
                            >
                                {availableExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                                {isCustomExercise && customExerciseName.trim() && !availableExercises.includes(customExerciseName.trim()) && (
                                    <option value={customExerciseName.trim()}>{customExerciseName.trim()}</option>
                                )}
                            </select>
                        </div>

                        <div className="flex-1 w-full relative">
                            {exerciseHistory.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={exerciseHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickMargin={10} minTickGap={15} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '8px', fontSize: '13px' }}
                                            itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                                            labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                                            formatter={(value: any) => {
                                                const workout = workouts.find(w => w.exercise === graphExercise);
                                                const unit = workout?.split === 'Cardio' ? 'mins' : 'kg';
                                                const label = workout?.split === 'Cardio' ? 'Total Time' : 'Max 1RM';
                                                return [`${value} ${unit}`, label];
                                            }}
                                        />
                                        <Line type="monotone" dataKey="repsMax" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#10b981', strokeWidth: 0 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
                                    <Activity className="w-8 h-8 mb-2 opacity-50" />
                                    <span className="text-xs italic px-6 text-center">Log this exercise multiple times to see your strength progression curve.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
