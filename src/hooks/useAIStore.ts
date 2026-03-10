import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useWithingsStore } from './useWithingsStore';
import { useGymStore } from './useGymStore';
import { useTodoStore } from './useTodoStore';
import { useNutritionStore } from './useNutritionStore';
import { useSocialStore } from './useSocialStore';
import { useScratchpadStore } from './useScratchpadStore';
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
                const today = format(new Date(), 'yyyy-MM-dd');
                const recentDays = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'));

                const withings = useWithingsStore.getState().sleepData;

                const gymLogs = useGymStore.getState().workouts.filter(w =>
                    recentDays.some(date => w.timestamp.startsWith(date))
                );

                const todos = useTodoStore.getState().todos;
                const completedTodos = todos.filter(t => t.status === 'done').length;
                const pendingTodos = todos.filter(t => t.status !== 'done').length;

                const nutritionEntries = useNutritionStore.getState().entries.filter(e =>
                    e.timestamp.startsWith(today)
                );
                const activeCalories = nutritionEntries.reduce((acc, curr) => acc + curr.calories, 0);

                const socialLogs = useSocialStore.getState().pubLogs.filter(p =>
                    recentDays.some(date => p.timestamp.startsWith(date))
                );

                const scratchpadEntries = useScratchpadStore.getState().entries.filter(e =>
                    recentDays.some(date => e.timestamp.startsWith(date))
                );

                const user = useAuth.getState().user;
                const firstName = user?.displayName?.split(' ')[0] || 'Wayne';

                // Build the Prompt Context
                let dataContext = `Here is ${firstName}'s logged data for the past 7 days:\n\n`;

                if (withings) {
                    dataContext += `[SLEEP LAST NIGHT]\nDuration: ${Math.floor(withings.duration / 3600)}h ${Math.floor((withings.duration % 3600) / 60)}m. Score: ${withings.score}/100. Deep: ${Math.floor(withings.deep / 3600)}h ${Math.floor((withings.deep % 3600) / 60)}m.\n`;
                } else {
                    dataContext += `[SLEEP] No smartwatch data available today.\n`;
                }

                if (gymLogs.length > 0) {
                    dataContext += `[GYM LAST 7 DAYS]\nRecent logged exercises:\n${gymLogs.map(g => `- ${format(new Date(g.timestamp), 'EEEE, MMM d')}: ${g.exercise}`).join('\n')}\n`;
                }

                dataContext += `[PRODUCTIVITY TOTALS] Completed Tasks: ${completedTodos}. Pending Tasks: ${pendingTodos}.\n`;
                dataContext += `[NUTRITION TODAY] Calories logged so far today: ${activeCalories} kcal.\n`;

                if (socialLogs.length > 0) {
                    dataContext += `[SOCIAL LAST 7 DAYS]\nVisited Pubs:\n${socialLogs.map(s => `- ${format(new Date(s.timestamp), 'EEEE, MMM d')}: ${s.pubName} (Atmosphere: ${s.atmosphere}/10, Pints: £${s.pintPrice})`).join('\n')}\n`;
                }

                if (scratchpadEntries.length > 0) {
                    dataContext += `\n[RECENT SCRATCHPAD NOTES & JOURNAL ENTRIES]\nThe user has written the following quick notes over the last 7 days. These are top of mind thoughts, journals, or reminders they wrote down:\n${scratchpadEntries.map(e => `- ${format(new Date(e.timestamp), 'EEEE, MMM d @ h:mm a')}: "${e.text}"`).join('\n')}\n`;
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
