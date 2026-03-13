import React from 'react';
import { Activity, Flame, Timer, MapPin, Maximize2, X } from 'lucide-react';
import { useWithingsStore } from '../../hooks/useWithingsStore';
import { format, parseISO } from 'date-fns';

const WORKOUT_NAMES: Record<number, string> = {
    1: "Walking",
    2: "Running",
    3: "Hiking",
    4: "Cycling",
    5: "Swimming",
    6: "Boxing",
    7: "Climbing",
    8: "Rowing",
    9: "Elliptical",
    12: "Zumba",
    15: "Tennis",
    16: "Badminton",
    21: "Basketball",
    24: "Soccer",
    34: "Bodyweight",
    90: "General",
    187: "Dog Walking",
    188: "Gardening",
    191: "Strength Training",
    192: "Functional Training",
    274: "Pilates",
    305: "Yoga",
};

export const WithingsWorkoutsModule: React.FC = () => {
    const { isConnected, workouts } = useWithingsStore();
    const [showFullHistory, setShowFullHistory] = React.useState(false);

    if (!isConnected || workouts.length === 0) return null;

    const formatWorkoutDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const WorkoutCard = ({ workout }: { workout: any }) => (
        <div key={workout.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-indigo-500/30 transition-all group">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-bold text-zinc-100">{WORKOUT_NAMES[workout.category] || 'Workout'}</h3>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-tighter">
                        {format(parseISO(workout.timestamp), 'MMM do, HH:mm')}
                    </p>
                </div>
                <div className="bg-indigo-500/10 text-indigo-400 p-1.5 rounded-lg group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <Activity className="w-4 h-4" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-zinc-400">
                    <Timer className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-xs font-semibold tabular-nums">{formatWorkoutDuration(workout.duration)}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-xs font-semibold tabular-nums">{Math.round(workout.calories)} kcal</span>
                </div>
                {workout.distance !== undefined && workout.distance > 0 && (
                    <div className="flex items-center gap-2 text-zinc-400 col-span-2 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-semibold tabular-nums">{(workout.distance / 1000).toFixed(2)} km</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 mt-6 relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-bold text-zinc-100">Smartwatch Exercise Logs</h2>
                </div>
                <button 
                    onClick={() => setShowFullHistory(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 text-xs font-semibold text-zinc-400 hover:text-indigo-400 rounded-lg transition-all"
                >
                    <Maximize2 className="w-3.5 h-3.5" />
                    View History
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workouts.slice(0, 6).map((workout) => (
                    <WorkoutCard key={workout.id} workout={workout} />
                ))}
            </div>

            {showFullHistory && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col h-[85vh] overflow-hidden">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <Activity className="w-6 h-6 text-indigo-400" />
                                <h2 className="text-xl font-bold text-zinc-100">Workout History (Last 30 Days)</h2>
                            </div>
                            <button 
                                onClick={() => setShowFullHistory(false)}
                                className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {workouts.map((workout) => (
                                    <WorkoutCard key={workout.id} workout={workout} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
