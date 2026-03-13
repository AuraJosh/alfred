import React from 'react';
import { Activity, Flame, Timer, MapPin } from 'lucide-react';
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
    15: "Tennis",
    16: "Badminton",
    34: "Bodyweight",
    90: "General",
    191: "Strength Training",
};

export const WithingsWorkoutsModule: React.FC = () => {
    const { isConnected, workouts } = useWithingsStore();

    if (!isConnected || workouts.length === 0) return null;

    const formatWorkoutDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 mt-6 relative overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-zinc-100">Smartwatch Exercise Logs</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workouts.slice(0, 6).map((workout) => (
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
                ))}
            </div>

            {workouts.length > 6 && (
                <p className="text-[10px] text-zinc-500 text-center mt-4 italic">Showing latest 6 activities tracked by Withings</p>
            )}
        </div>
    );
};
