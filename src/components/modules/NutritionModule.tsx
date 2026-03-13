import React, { useState } from 'react';
import { useNutritionStore } from '../../hooks/useNutritionStore';
import { useUI } from '../../context/UIContext';
import { Utensils, Plus, Trash2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { isToday, parseISO, subDays, addDays, isSameDay, format } from 'date-fns';

export const NutritionModule: React.FC = () => {
    const { entries, addEntry, deleteEntry } = useNutritionStore();
    const { showConfirm } = useUI();

    // Form state
    const [meal, setMeal] = useState("");
    const [ingredients, setIngredients] = useState("");
    const [calories, setCalories] = useState("");
    const [showExpandedForm, setShowExpandedForm] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());

    const handlePrev = () => setViewDate(prev => subDays(prev, 1));
    const handleNext = () => setViewDate(prev => addDays(prev, 1));

    // Filter viewDate's entries
    const viewDateEntries = entries
        .filter(c => isSameDay(parseISO(c.timestamp), viewDate))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const viewDateCalories = viewDateEntries.reduce((sum, current) => sum + current.calories, 0);

    const handleAddEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        const numCals = Number(calories);
        if (!meal.trim() || numCals <= 0) return;

        // If viewing today, use accurate current time. Otherwise, use end of the viewed day.
        const entryTime = isToday(viewDate)
            ? new Date().toISOString()
            : new Date(viewDate.setHours(23, 59, 59, 999)).toISOString();

        await addEntry(meal, numCals, ingredients.trim() || undefined, entryTime);

        // Reset form
        setMeal("");
        setIngredients("");
        setCalories("");
        setShowExpandedForm(false);
    };

    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row gap-8 h-[500px]">
            {/* Input Side (1/3 width on md+) */}
            <div className="w-full md:w-1/3 flex flex-col justify-between shrink-0">
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Utensils className="w-5 h-5 text-orange-400" />
                        <h2 className="text-lg font-bold text-zinc-100">Calorie Tracker</h2>
                    </div>

                    <div className="text-center py-6 border-b border-zinc-800 mb-6 flex flex-col items-center">
                        <p className="text-sm text-zinc-500 uppercase tracking-widest mb-1">{isToday(viewDate) ? "Today's Total" : "Total Intake"}</p>
                        <div className="text-5xl font-black text-white">{viewDateCalories} <span className="text-xl text-zinc-500 font-medium">kcal</span></div>
                    </div>
                </div>

                <form onSubmit={handleAddEntry} className="flex flex-col gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Log Meal</p>

                    <div>
                        <input
                            type="text"
                            required
                            value={meal}
                            onChange={(e) => setMeal(e.target.value)}
                            placeholder="Meal name (e.g. Freddo)"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
                        />
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="number"
                            required
                            min="1"
                            value={calories}
                            onChange={(e) => setCalories(e.target.value)}
                            placeholder="Calories (kcal)"
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
                        />
                        <button
                            type="button"
                            onClick={() => setShowExpandedForm(!showExpandedForm)}
                            className={`p-2 border rounded-lg transition-colors flex items-center justify-center ${showExpandedForm || ingredients ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                            title="Add Ingredients"
                        >
                            {showExpandedForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>

                    {(showExpandedForm || ingredients) && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                            <textarea
                                value={ingredients}
                                onChange={(e) => setIngredients(e.target.value)}
                                placeholder="Ingredients (e.g. chocolate, caramel...)"
                                rows={2}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!meal.trim() || !calories}
                        className="w-full mt-2 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add Food
                    </button>
                </form>
            </div>

            {/* List Side (2/3 width on md+) */}
            <div className="w-full md:w-2/3 border-t md:border-t-0 md:border-l border-zinc-800 pt-6 md:pt-0 md:pl-8 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                        <button onClick={handlePrev} className="p-1 text-zinc-400 hover:text-white transition-colors hover:bg-zinc-800 rounded">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="min-w-[120px] text-center text-sm font-semibold text-zinc-300">
                            {isToday(viewDate) ? 'Today' : format(viewDate, 'MMM do, yyyy')}
                        </span>
                        <button onClick={handleNext} disabled={isToday(viewDate)} className="p-1 text-zinc-400 hover:text-white transition-colors disabled:opacity-30 hover:bg-zinc-800 disabled:hover:bg-transparent rounded">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded-full">{viewDateEntries.length} items</span>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {viewDateEntries.length > 0 ? (
                        <div className="space-y-3">
                            {viewDateEntries.map(entry => (
                                <div key={entry.id} className="group flex items-start justify-between bg-zinc-900 border border-zinc-800/50 p-4 rounded-xl hover:border-zinc-700 transition-colors relative">
                                    <div className="flex-1 pr-12">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-zinc-100">{entry.meal}</h4>
                                            <span className="text-xs font-mono text-zinc-500 shrink-0 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                                                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        {entry.ingredients && (
                                            <p className="text-xs text-zinc-400 mt-1 italic">
                                                {entry.ingredients}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0 flex items-center gap-4">
                                        <div className="font-bold text-orange-400">
                                            {entry.calories} <span className="text-xs text-orange-400/50">kcal</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                showConfirm({
                                                    title: "Delete Entry?",
                                                    message: "Are you sure you want to permanently delete this nutrition entry from the database?",
                                                    confirmText: "Delete",
                                                    onConfirm: () => deleteEntry(entry.id)
                                                });
                                            }}
                                            className="opacity-0 group-hover:opacity-100 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-red-400 p-2 transition-all bg-zinc-900 rounded-md"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full min-h-[200px] w-full flex flex-col items-center justify-center text-zinc-600 border border-dashed border-zinc-800 rounded-xl">
                            <Utensils className="w-8 h-8 mb-2 opacity-30" />
                            <span className="text-xs italic text-zinc-500">No food logged for this date.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
