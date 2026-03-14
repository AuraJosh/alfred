import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../hooks/useStore';
import { LogOut, Plus, Activity, Fingerprint, Sparkles, Menu, X as CloseIcon } from 'lucide-react';
import { NewTrackerModal } from '../components/modules/NewTrackerModal';
import { TrackerWidget } from '../components/dashboard/TrackerWidget';
import { TrackerExpandedModal } from '../components/dashboard/TrackerExpandedModal';
import { useUI } from '../context/UIContext';
import { TodoModule } from '../components/modules/TodoModule';
import { GymModule } from '../components/modules/GymModule';
import { ScratchpadModule } from '../components/modules/ScratchpadModule';
import { NutritionModule } from '../components/modules/NutritionModule';
import { SocialModule } from '../components/modules/SocialModule';
import { StudyModule } from '../components/modules/StudyModule';
import { SleepModule } from '../components/modules/SleepModule';
import { IntelligenceModule } from '../components/modules/IntelligenceModule';
import { ShoppingListModule } from '../components/modules/ShoppingListModule';
import { WithingsWorkoutsModule } from '../components/modules/WithingsWorkoutsModule';
import { HealthTrendModule } from '../components/modules/HealthTrendModule';
import { ThreePillarsModule } from '../components/modules/ThreePillarsModule';
import { ChatWidget } from '../components/modules/ChatWidget';

export const Dashboard: React.FC = () => {
    const { user, signOut, enableBiometrics, isBiometricEnabled } = useAuth();
    const { trackers, logs, loading, addLog, deleteTracker } = useStore();
    const { addToast, showPrompt, showConfirm } = useUI();
    const [showNewTracker, setShowNewTracker] = React.useState(false);
    const [selectedTrackerId, setSelectedTrackerId] = React.useState<string | null>(null);
    const [showIntelligence, setShowIntelligence] = React.useState(false);
    const [showNav, setShowNav] = React.useState(false);

    const sections = [
        { id: 'trackers', name: 'Primary Trackers' },
        { id: 'days-since', name: 'Days Since Trackers' },
        { id: 'ai-briefing', name: 'Daily Intelligence' },
        { id: 'scratchpad', name: 'Journal & Notes' },
        { id: 'todo-lists', name: 'Execution Metrics' },
        { id: 'nutrition', name: 'Nutrition' },
        { id: 'gym', name: 'Fitness & Gym' },
        { id: 'social', name: 'Social Activity' },
        { id: 'study', name: 'Deep Work' },
        { id: 'sleep-data', name: 'Sleep & Bio-Telemetry' },
    ];

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            setShowNav(false);
        }
    };

    const standardTrackers = trackers.filter(t => !t.isDaysSince);
    const daysSinceTrackers = trackers.filter(t => t.isDaysSince);

    const handleEnableBiometrics = async () => {
        try {
            await enableBiometrics();
            addToast("FaceID Enabled!", "success");
        } catch (err) {
            addToast("Could not setup Biometrics.", "error");
        }
    };

    // Helper function to handle a quick logging action
    const handleQuickLog = async (trackerId: string, type: string, payload?: any) => {
        const submitLog = async (finalValue: any) => {
            try {
                await addLog({ trackerId, value: finalValue });
                addToast("Log saved successfully!", "success");
            } catch (e) {
                console.error("Failed to log:", e);
                addToast("Failed to save log. Please try again.", "error");
            }
        };

        if (payload !== undefined) {
            submitLog(payload);
        } else {
            if (type === 'COUNTER') submitLog(1);
            else if (type === 'SCALAR' || type === 'RATING') {
                showPrompt({
                    title: "Log Entry",
                    message: "Enter the numerical value for this tracker:",
                    confirmText: "Save",
                    onConfirm: (input) => {
                        const num = Number(input);
                        if (isNaN(num)) {
                            addToast("Please enter a valid number.", "error");
                            return;
                        }
                        submitLog(num);
                    }
                });
            } else {
                submitLog(true);
            }
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-slate-50 p-6 md:p-10">
            <header className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <button 
                            onClick={() => setShowNav(!showNav)}
                            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors"
                            title="Navigate Sections"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        
                        {showNav && (
                            <>
                                <div className="fixed inset-0 z-[100]" onClick={() => setShowNav(false)} />
                                <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-2 z-[101] animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Dashboard Navigation</span>
                                        <button onClick={() => setShowNav(false)} className="text-zinc-600 hover:text-white">
                                            <CloseIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                    {sections.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => scrollToSection(s.id)}
                                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-amber-400 hover:bg-zinc-800 transition-colors flex items-center justify-between group"
                                        >
                                            {s.name}
                                            <span className="text-[10px] text-zinc-600 group-hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">Jump</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-1 text-zinc-100">Alfred</h1>
                        <p className="text-sm text-zinc-400">Welcome back, Master {user?.displayName?.split(' ')[0] || 'Wayne'}.</p>
                    </div>
                </div>
                <div className="flex gap-2 sm:gap-3">
                    {!isBiometricEnabled && (
                        <button
                            onClick={handleEnableBiometrics}
                            className="flex items-center px-3 py-2 text-sm font-medium text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500 rounded-lg border border-indigo-500/20 transition-all"
                            title="Setup FaceID"
                        >
                            <Fingerprint className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Setup FaceID</span>
                        </button>
                    )}
                    <button
                        onClick={() => setShowNewTracker(true)}
                        className="flex items-center px-3 sm:px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">New Tracker</span>
                        <span className="sm:hidden">New</span>
                    </button>
                    <button
                        onClick={signOut}
                        className="flex items-center px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-colors"
                    >
                        <LogOut className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Sign Out</span>
                    </button>
                </div>
            </header>

            <main>

                {loading ? (
                    <div className="animate-pulse flex gap-4">
                        <div className="h-32 w-64 bg-zinc-900 rounded-xl border border-zinc-800"></div>
                        <div className="h-32 w-64 bg-zinc-900 rounded-xl border border-zinc-800"></div>
                    </div>
                ) : trackers.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-2xl">
                        <Activity className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-zinc-300 mb-1">No trackers yet</h3>
                        <p className="text-sm text-zinc-500 mb-4">You are not tracking anything. Friction-free data starts here.</p>
                        <button
                            onClick={() => setShowNewTracker(true)}
                            className="inline-flex items-center px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Create your first tracker
                        </button>
                    </div>
                ) : (
                    <>
                        {standardTrackers.length > 0 && (
                            <div id="trackers" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 scroll-mt-20">
                                {/* Active Trackers Grid */}
                                {standardTrackers.map((tracker) => {
                                    // Filter logs belonging specifically to this tracker
                                    const trackerLogs = logs.filter(l => l.trackerId === tracker.id);

                                    return (
                                        <TrackerWidget
                                            key={tracker.id}
                                            tracker={tracker}
                                            logs={trackerLogs}
                                            onQuickLog={handleQuickLog}
                                            onDelete={(id) => {
                                                showConfirm({
                                                    title: "Delete Tracker?",
                                                    message: "Are you sure you want to permanently delete this tracker and all of its associated logs from the database?",
                                                    confirmText: "Delete",
                                                    onConfirm: () => {
                                                        deleteTracker(id);
                                                        addToast("Tracker deleted.", "info");
                                                    }
                                                });
                                            }}
                                            onClick={(id) => setSelectedTrackerId(id)}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {daysSinceTrackers.length > 0 && (
                            <div id="days-since" className="mt-12 pt-8 border-t border-zinc-900 border-dashed scroll-mt-20">
                                <h2 className="text-xl font-bold text-zinc-300 mb-6">Days Since...</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {daysSinceTrackers.map((tracker) => {
                                        const trackerLogs = logs.filter(l => l.trackerId === tracker.id);

                                        return (
                                            <TrackerWidget
                                                key={tracker.id}
                                                tracker={tracker}
                                                logs={trackerLogs}
                                                onQuickLog={handleQuickLog}
                                                onDelete={(id) => {
                                                    showConfirm({
                                                        title: "Delete Tracker?",
                                                        message: "Are you sure you want to permanently delete this tracker and all of its associated logs?",
                                                        confirmText: "Delete",
                                                        onConfirm: () => {
                                                            deleteTracker(id);
                                                            addToast("Tracker deleted.", "info");
                                                        }
                                                    });
                                                }}
                                                onClick={(id) => setSelectedTrackerId(id)}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div id="ai-briefing" className="mt-8 pt-4 border-t border-zinc-900 border-dashed scroll-mt-20">
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={() => setShowIntelligence(!showIntelligence)}
                                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm font-semibold text-zinc-400 hover:text-amber-500 rounded-xl transition-all shadow-lg"
                                >
                                    {showIntelligence ? (
                                        <><Sparkles className="w-4 h-4" /> Hide AI Briefing</>
                                    ) : (
                                        <><Sparkles className="w-4 h-4" /> Open AI Briefing</>
                                    )}
                                </button>
                            </div>
                            
                            {showIntelligence && (
                                <IntelligenceModule />
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* Specialized Modules Section */}
            <div id="scratchpad" className="mt-12 pt-8 border-t border-zinc-900 border-dashed scroll-mt-20">
                <ScratchpadModule />
            </div>

            <div id="todo-lists" className="mt-12 pt-8 border-t border-zinc-900 border-dashed scroll-mt-20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TodoModule />
                    <ShoppingListModule />
                </div>
            </div>

            <div id="nutrition" className="mt-12 pt-8 border-t border-zinc-900 border-dashed scroll-mt-20">
                <h2 className="text-xl font-bold text-zinc-300">Nutrition Tracker</h2>
                <NutritionModule />
            </div>

            <div id="gym" className="mt-12 pt-8 border-t border-zinc-900 border-dashed scroll-mt-20">
                <h2 className="text-xl font-bold text-zinc-300">Physical Mastery</h2>
                <GymModule />
            </div>

            <div id="social" className="mt-12 pt-8 border-t border-zinc-900 border-dashed scroll-mt-20">
                <h2 className="text-xl font-bold text-zinc-300">Pub Tracker</h2>
                <SocialModule />
            </div>

            <div id="study" className="mt-12 pt-8 border-t border-zinc-900 border-dashed scroll-mt-20">
                <h2 className="text-xl font-bold text-zinc-300">Deep Work & Study v2</h2>
                <StudyModule />
            </div>

            <div id="sleep-data" className="mt-12 pt-8 border-t border-zinc-900 border-dashed mb-10 scroll-mt-20">
                <h2 className="text-xl font-bold text-zinc-300">Sleep & Recovery</h2>
                <SleepModule />
                <WithingsWorkoutsModule />
                <HealthTrendModule />
                <ThreePillarsModule />
            </div>

            {showNewTracker && <NewTrackerModal onClose={() => setShowNewTracker(false)} />}

            {selectedTrackerId && trackers.find(t => t.id === selectedTrackerId) && (
                <TrackerExpandedModal
                    tracker={trackers.find(t => t.id === selectedTrackerId)!}
                    logs={logs.filter(l => l.trackerId === selectedTrackerId)}
                    onClose={() => setSelectedTrackerId(null)}
                />
            )}

            <ChatWidget />
        </div>
    );
};
