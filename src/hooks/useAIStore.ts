import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useWithingsStore } from './useWithingsStore';
import { useGymStore } from './useGymStore';
import { useTodoStore } from './useTodoStore';
import { useNutritionStore } from './useNutritionStore';
import { useSocialStore } from './useSocialStore';
import { useScratchpadStore } from './useScratchpadStore';
import { useStudyStore } from './useStudyStore';
import type { StudyTask, StudySession } from './useStudyStore';
import { useStore } from './useStore';
import { useAuth } from './useAuth';
import { format, subDays } from 'date-fns';

interface AIState {
    apiKey: string | null;
    insight: {
        date: string;
        text: string;
    } | null;
    loading: boolean;
    error: string | null;
    setApiKey: (key: string) => void;
    clearApiKey: () => void;
    generateInsight: () => Promise<void>;
    getAIContext: () => string;
}

export const useAIStore = create<AIState>()(
    persist(
        (set, get) => ({
            apiKey: null,
            insight: null,
            loading: false,
            error: null,

            setApiKey: (key) => set({ apiKey: key, error: null }),
            clearApiKey: () => set({ apiKey: null, insight: null }),

            getAIContext: () => {
                const recentDays = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'));

                const withingsStore = useWithingsStore.getState();
                const sleepData = withingsStore.sleepData;
                const weeklySleep = withingsStore.weeklySleepData;

                const gymLogs = useGymStore.getState().workouts.filter(w =>
                    recentDays.some(date => w.timestamp.startsWith(date))
                );

                const todos = useTodoStore.getState().todos;

                const nutritionEntries = useNutritionStore.getState().entries.filter(e =>
                    recentDays.some(date => e.timestamp.startsWith(date))
                );

                const studyStore = useStudyStore.getState();
                const studyTasks = studyStore.tasks;
                const recentStudySessions = studyStore.sessions.filter((s: StudySession) =>
                    recentDays.some(date => s.timestamp.startsWith(date))
                );

                const socialLogs = useSocialStore.getState().pubLogs.filter(p =>
                    recentDays.some(date => p.timestamp.startsWith(date))
                );

                const generalStore = useStore.getState();
                const trackers = generalStore.trackers;
                const logs = generalStore.logs;

                const scratchpadEntries = useScratchpadStore.getState().entries.filter(e =>
                    recentDays.some(date => e.timestamp.startsWith(date))
                );

                const user = useAuth.getState().user;
                const firstName = user?.displayName?.split(' ')[0] || 'Wayne';

                // Build the Prompt Context
                let dataContext = `Here is ${firstName}'s logged data for the past 7 days:\n\n`;

                if (trackers.length > 0) {
                    dataContext += `[TRACKERS & METRICS]\n`;
                    trackers.forEach((t: any) => {
                        const trackerLogs = (logs as any[])
                            .filter(l => l.trackerId === t.id)
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                        
                        const latest = trackerLogs[0];
                        if (latest) {
                            if (t.isDaysSince) {
                                const days = Math.floor((new Date().getTime() - new Date(latest.timestamp).getTime()) / (1000 * 60 * 60 * 24));
                                dataContext += `- Days since ${t.name}: ${days} (Last log: ${format(new Date(latest.timestamp), 'MMM d')})\n`;
                            } else {
                                dataContext += `- ${t.name}: ${latest.value} (Last log: ${format(new Date(latest.timestamp), 'MMM d')})\n`;
                            }
                        }
                    });
                }

                if (sleepData) {
                    dataContext += `\n[SLEEP LAST NIGHT]\nDuration: ${Math.floor(sleepData.duration / 3600)}h ${Math.floor((sleepData.duration % 3600) / 60)}m. Score: ${sleepData.score}/100. Deep: ${Math.floor(sleepData.deep / 3600)}h ${Math.floor((sleepData.deep % 3600) / 60)}m. Resting HR: ${sleepData.resting_hr} bpm.\n`;
                }

                if (weeklySleep.length > 0) {
                    dataContext += `[WEEKLY SLEEP & RECOVERY TRENDS]\n${weeklySleep.map(s => `- ${s.date}: Score ${s.score}, ${Math.floor(s.duration / 3600)}h duration, HRV: ${s.hrv}ms, Resp: ${s.respiration_rate}rpm`).join('\n')}\n`;
                }

                const vitalsData = withingsStore.vitals;
                const weeklyVitals = withingsStore.weeklyVitals;
                if (vitalsData || weeklyVitals.length > 0) {
                    dataContext += `\n[VITALS & TEMPERATURE TRENDS]\n`;
                    if (vitalsData) {
                        dataContext += `Current: Temp ${vitalsData.temp?.toFixed(1)}°C, RHR ${vitalsData.rhr} bpm.\n`;
                    }
                    if (weeklyVitals.length > 0) {
                        dataContext += `Weekly Trends:\n${weeklyVitals.map(v => `- ${v.date}: ${v.temp?.toFixed(1) || 'N/A'}°C, ${v.rhr || 'N/A'} bpm`).join('\n')}\n`;
                    }
                }

                if (gymLogs.length > 0) {
                    dataContext += `\n[GYM LOGS - LAST 7 DAYS]\n${gymLogs.map(g => {
                        const setsInfo = g.sets.map(s => `${s.reps} reps @ ${s.weight}kg`).join(', ');
                        return `- ${format(new Date(g.timestamp), 'EEEE, MMM d')}: ${g.exercise} (${setsInfo})`;
                    }).join('\n')}\n`;
                }

                if (nutritionEntries.length > 0) {
                    dataContext += `\n[NUTRITION - LAST 7 DAYS]\n`;
                    // Group by date
                    const nutritionByDate: Record<string, typeof nutritionEntries> = {};
                    nutritionEntries.forEach(e => {
                        const date = e.timestamp.split('T')[0];
                        if (!nutritionByDate[date]) nutritionByDate[date] = [];
                        nutritionByDate[date].push(e);
                    });

                    Object.entries(nutritionByDate).sort((a, b) => b[0].localeCompare(a[0])).forEach(([date, entries]) => {
                        const dailyCals = entries.reduce((acc, curr) => acc + curr.calories, 0);
                        dataContext += `${format(new Date(date), 'EEEE, MMM d')}: Total ${dailyCals} kcal\n`;
                        entries.forEach(e => {
                            dataContext += `  - ${e.meal} (${e.calories} kcal)${e.ingredients ? `. Ingredients: ${e.ingredients}` : ''}\n`;
                        });
                    });
                }

                dataContext += `\n[TODO LIST]\n`;
                const pending = todos.filter(t => t.status !== 'done');
                const recentlyCompleted = todos.filter(t => t.status === 'done' && t.completedAt && recentDays.some(date => t.completedAt?.startsWith(date)));
                
                if (pending.length > 0) {
                    dataContext += `Pending Tasks:\n${pending.map(t => `- [${t.type}] ${t.content}`).join('\n')}\n`;
                }
                if (recentlyCompleted.length > 0) {
                    dataContext += `Recently Completed (7 days):\n${recentlyCompleted.map(t => `- [${t.type}] ${t.content} (Done: ${format(new Date(t.completedAt!), 'MMM d')})`).join('\n')}\n`;
                }

                const workoutStore = useWithingsStore.getState();
                const withingsWorkouts = workoutStore.workouts.filter(w =>
                    recentDays.some(date => w.timestamp.startsWith(date))
                );

                if (withingsWorkouts.length > 0) {
                    dataContext += `\n[SMARTWATCH WORKOUTS - LAST 7 DAYS]\n${withingsWorkouts.map(w => {
                        const duration = Math.floor(w.duration / 60);
                        return `- ${format(new Date(w.timestamp), 'EEEE, MMM d @ h:mm a')}: ${w.category === 559 ? 'Dog Walking' : w.category === 7 ? 'Swimming' : (w as any).category_name || 'Activity'} (${duration} mins, ${w.calories} kcal)${w.distance ? `, Distance: ${(w.distance / 1000).toFixed(2)}km` : ''}`;
                    }).join('\n')}\n`;
                }

                if (studyTasks.length > 0 || recentStudySessions.length > 0) {
                    dataContext += `\n[DEEP WORK & STUDY]\n`;
                    if (studyTasks.length > 0) {
                        const sortedTasks = [...studyTasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                        const activeStudyTasks = sortedTasks.filter(t => !t.isCompleted);
                        const completedStudyTasks = sortedTasks.filter(t => t.isCompleted && t.completedAt && recentDays.some(date => t.completedAt?.startsWith(date)));
                        
                        if (activeStudyTasks.length > 0) {
                            dataContext += `Active Checklist Items:\n${activeStudyTasks.map((t: StudyTask) => `- ${t.content} (Subject: ${t.subject}, Module: ${t.module})`).join('\n')}\n`;
                        }
                        if (completedStudyTasks.length > 0) {
                            dataContext += `Completed Items (7 days):\n${completedStudyTasks.map((t: StudyTask) => `- [X] ${t.content} (Subject: ${t.subject}, Done: ${format(new Date(t.completedAt!), 'MMM d')})`).join('\n')}\n`;
                        }
                    }
                    if (recentStudySessions.length > 0) {
                        const sortedSessions = [...recentStudySessions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                        dataContext += `Previous Sessions:\n${sortedSessions.map((s: StudySession) => `- ${format(new Date(s.timestamp), 'MMM d, h:mm a')}: ${s.subject} (${s.durationMinutes} mins)${s.notes ? `. Notes: ${s.notes}` : ''}`).join('\n')}\n`;
                    }
                }

                if (socialLogs.length > 0) {
                    dataContext += `\n[SOCIAL LAST 7 DAYS]\nVisited Pubs:\n${socialLogs.map(s => `- ${format(new Date(s.timestamp), 'EEEE, MMM d')}: ${s.pubName} (Atmosphere: ${s.atmosphere}/10, Pints: £${s.pintPrice})`).join('\n')}\n`;
                }

                if (scratchpadEntries.length > 0) {
                    dataContext += `\n[RECENT SCRATCHPAD NOTES & JOURNAL ENTRIES]\n${scratchpadEntries.map(e => `- ${format(new Date(e.timestamp), 'EEEE, MMM d @ h:mm a')}: "${e.text}"`).join('\n')}\n`;
                }

                return dataContext;
            },

            generateInsight: async () => {
                const { apiKey, getAIContext } = get();
                if (!apiKey) {
                    set({ error: "No Gemini API Key found." });
                    return;
                }

                set({ loading: true, error: null });

                try {
                    const today = format(new Date(), 'yyyy-MM-dd');
                    const user = useAuth.getState().user;
                    const firstName = user?.displayName?.split(' ')[0] || 'Wayne';
                    const dataContext = getAIContext();

                    const prompt = `
You are Alfred, a practical, no-nonsense health and productivity coach for Master ${firstName}.
Below is the raw data from his "Alfred" dashboard over the past 7 days.

${dataContext}

Your Objective:
Write a comprehensive, highly personalized briefing providing actual, actionable insights based on his data.

CRITICAL INSTRUCTION: You MUST format your entire response EXACTLY like this, including the line breaks. Do not deviate from this template or add extra conversational filler:

Sleep & Recovery Analysis

The Data: [Write a 1-sentence summary of the most prominent data points you are basing your insight on, clearly distinguishing today's data from the weekly totals. Example: "5h 42m sleep last night, 3 gym sessions this week, 0 pub visits."]

The Insight: [Write a deep, 4-5 sentence paragraph analyzing the connections between the numbers. Speak plainly and directly. Tell him specifically how he should approach today based on his recovery state and rolling fatigue. End the paragraph with a bolded "**Action:**" step.]

CRITICAL INSTRUCTION: You must complete the ENTIRE template. Do not stop after "The Data". You must generate "The Insight" paragraph fully and completely. Never cut off mid-sentence.
`;

                    // Call Google Gemini API directly using simple REST to avoid heavy npm SDK
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{ text: prompt }]
                            }],
                            generationConfig: {
                                temperature: 0.7,
                            }
                        })
                    });

                    if (!response.ok) {
                        const errText = await response.text();
                        console.error("Gemini API Error:", errText);
                        throw new Error(`API returned ${response.status}`);
                    }

                    const data = await response.json();

                    if (data.error) {
                        throw new Error(data.error.message || "Gemini API returned an error");
                    }

                    const parts = data.candidates?.[0]?.content?.parts;
                    const text = parts ? parts.map((p: any) => p.text).join('') : null;

                    if (!text) {
                        throw new Error("Invalid response format from Gemini");
                    }

                    set({
                        insight: { date: today, text: text.trim() },
                        error: null
                    });

                } catch (err: any) {
                    set({ error: err.message || "Failed to generate AI insight." });
                } finally {
                    set({ loading: false });
                }
            }
        }),
        {
            name: 'alfred-ai-storage',
            partialize: (state) => ({ apiKey: state.apiKey, insight: state.insight }),
        }
    )
);
