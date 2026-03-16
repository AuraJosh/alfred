import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { Activity, Coffee, Moon, Dumbbell, Wallet, Plus, Plane } from 'lucide-react';
import type { TrackerType } from '../../types';

const PRESET_TRACKERS = [
    { name: 'Brush Teeth', type: 'DOUBLE_BOOLEAN' as TrackerType, icon: Activity, category: 'Health', labels: ['Morning', 'Night'] as [string, string] },
    { name: 'Water (Glasses)', type: 'COUNTER' as TrackerType, icon: Coffee, category: 'Health', viz: 'streak' },
    { name: 'Sleep (Hours)', type: 'SCALAR' as TrackerType, icon: Moon, category: 'Health', viz: 'line_graph' },
    { name: 'Gym Workout', type: 'COMPLEX' as TrackerType, icon: Dumbbell, category: 'Health', holidayPaused: true },
    { name: 'Shopping', type: 'BOOLEAN' as TrackerType, icon: Wallet, category: 'Finance', isDaysSince: true, holidayPaused: true },
    { name: 'Wash Hair', type: 'DOUBLE_BOOLEAN' as TrackerType, icon: Activity, category: 'Health', isDaysSince: true, labels: ['Shampoo', 'Conditioner'] as [string, string], holidayPaused: true }
];

export const NewTrackerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { addTracker } = useStore();
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'presets' | 'custom'>('presets');

    // Custom Tracker State
    const [customName, setCustomName] = useState("");
    const [customType, setCustomType] = useState<TrackerType>('BOOLEAN');
    const [customCategory, setCustomCategory] = useState("Custom");
    const [customViz, setCustomViz] = useState("line_graph");
    const [customIsDaysSince, setCustomIsDaysSince] = useState(false);
    const [customHolidayPaused, setCustomHolidayPaused] = useState(false);
    const [customLabels, setCustomLabels] = useState<[string, string]>(['Morning', 'Night']);

    const handleCreatePreset = async (preset: typeof PRESET_TRACKERS[0]) => {
        try {
            setLoading(true);
            await addTracker({
                name: preset.name,
                type: preset.type,
                category: preset.category,
                visualization: preset.viz || 'line_graph',
                isDaysSince: preset.isDaysSince || false,
                holidayPaused: preset.holidayPaused || false,
                ...(preset.labels ? { labels: preset.labels } : {})
            });
            onClose();
        } catch (error) {
            console.error("Failed to create tracker:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCustom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customName.trim()) return;

        try {
            setLoading(true);
            await addTracker({
                name: customName,
                type: customType,
                category: customCategory,
                visualization: customViz,
                isDaysSince: customIsDaysSince,
                holidayPaused: customHolidayPaused,
                ...(customType === 'DOUBLE_BOOLEAN' ? { labels: customLabels } : {})
            });
            onClose();
        } catch (error) {
            console.error("Failed to create custom tracker:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-100">Create a New Tracker</h2>
                        <p className="text-sm text-zinc-400">Track whatever matters to you.</p>
                    </div>
                </div>

                <div className="flex bg-zinc-950 p-1 rounded-lg mb-6 border border-zinc-800">
                    <button
                        onClick={() => setMode('presets')}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'presets' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Templates
                    </button>
                    <button
                        onClick={() => setMode('custom')}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${mode === 'custom' ? 'bg-amber-600/20 text-amber-400 shadow-sm border border-amber-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Plus className="w-4 h-4" />
                        Custom
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-[300px] custom-scrollbar mb-4">
                    {mode === 'presets' ? (
                        <div className="grid grid-cols-2 gap-3 pr-2">
                            {PRESET_TRACKERS.map((preset) => (
                                <button
                                    key={preset.name}
                                    onClick={() => handleCreatePreset(preset)}
                                    disabled={loading}
                                    className="flex items-center p-4 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all text-left group disabled:opacity-50"
                                >
                                    <div className="bg-zinc-800 group-hover:bg-amber-500/20 text-zinc-400 group-hover:text-amber-400 p-2 rounded-md mr-3 transition-colors">
                                        <preset.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm text-zinc-100">{preset.name}</p>
                                        <p className="text-xs text-zinc-500">{preset.type}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <form id="customTrackerForm" onSubmit={handleCreateCustom} className="space-y-4 pr-2">
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Tracker Name</label>
                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    placeholder="e.g. Read Pages, Meditation..."
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Input Type</label>
                                    <select
                                        value={customType}
                                        onChange={(e) => setCustomType(e.target.value as TrackerType)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer appearance-none"
                                    >
                                        <option value="BOOLEAN">Boolean (Done/Not Done)</option>
                                        <option value="DOUBLE_BOOLEAN">Double Objective (e.g. AM/PM, Shampoo/Cond)</option>
                                        <option value="COUNTER">Counter (e.g. Glasses of Water)</option>
                                        <option value="SCALAR">Scalar (e.g. Weight, Hours)</option>
                                        <option value="RATING">Rating (1-10)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Category</label>
                                    <input
                                        required
                                        type="text"
                                        value={customCategory}
                                        onChange={(e) => setCustomCategory(e.target.value)}
                                        placeholder="e.g. Health, Study..."
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                                    />
                                </div>
                            </div>

                            {customType !== 'DOUBLE_BOOLEAN' && (
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Visualization Style</label>
                                    <select
                                        value={customViz}
                                        onChange={(e) => setCustomViz(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors appearance-none cursor-pointer"
                                    >
                                        <option value="line_graph">Line Graph</option>
                                        <option value="streak">Streak Bar Chart</option>
                                        <option value="none">No Chart (Streak Only)</option>
                                    </select>
                                </div>
                            )}

                            {customType === 'DOUBLE_BOOLEAN' && (
                                <div className="space-y-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl animate-in slide-in-from-left-2 duration-300">
                                    <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Define Double Objectives</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">Button Label 1</label>
                                            <input
                                                type="text"
                                                required
                                                value={customLabels[0]}
                                                onChange={(e) => setCustomLabels([e.target.value, customLabels[1]])}
                                                placeholder="e.g. Morning"
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">Button Label 2</label>
                                            <input
                                                type="text"
                                                required
                                                value={customLabels[1]}
                                                onChange={(e) => setCustomLabels([customLabels[0], e.target.value])}
                                                placeholder="e.g. Night"
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 italic">This will create two buttons for logging this tracker daily (e.g. Morning/Night, Shampoo/Conditioner).</p>
                                </div>
                            )}

                            <label className="flex items-start gap-3 cursor-pointer mt-4 p-3 border border-zinc-800 rounded-lg bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={customIsDaysSince}
                                    onChange={(e) => setCustomIsDaysSince(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900"
                                />
                                <div>
                                    <span className="block text-sm font-medium text-zinc-200">Days Since Tracker</span>
                                    <span className="block text-xs text-zinc-500 mt-1">
                                        Groups this tracker into a dedicated "Days Since" section, ideal for tracking the time elapsed since rare events.
                                    </span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer p-3 border border-zinc-800 rounded-lg bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={customHolidayPaused}
                                    onChange={(e) => setCustomHolidayPaused(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-900"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="block text-sm font-medium text-zinc-200">Holiday Awareness</span>
                                        <Plane className="w-3 h-3 text-indigo-400" />
                                    </div>
                                    <span className="block text-xs text-zinc-500 mt-1">
                                        When active, streaks and "Days Since" metrics for this tracker will "freeze" during holiday periods (e.g. you don't need to wash hair on holiday).
                                    </span>
                                </div>
                            </label>
                        </form>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800 mt-auto">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium hover:bg-zinc-800 rounded-lg transition-colors text-zinc-300"
                    >
                        Cancel
                    </button>
                    {mode === 'custom' && (
                        <button
                            form="customTrackerForm"
                            type="submit"
                            disabled={loading || !customName.trim()}
                            className="px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                        >
                            Create Tracker
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
