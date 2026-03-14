import { create } from 'zustand';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './useAuth';
import { format, subDays } from 'date-fns';

interface WithingsTokens {
    access_token: string;
    refresh_token: string;
    userid: string;
    expires_at: number;
}

export interface SleepData {
    date: string;
    duration: number; // in seconds
    score: number;
    light: number;
    deep: number;
    rem: number;
    awake: number;
    resting_hr: number;
    hr_min: number;
    hr_avg: number;
    hrv: number;
    respiration_rate: number;
}

export interface VitalData {
    date: string;
    temp?: number;
    rhr?: number;
    vitals_score?: number;
}

export interface IntradayHeartRate {
    timestamp: string;
    hr: number;
}

export interface WithingsWorkout {
    id: number;
    category: number;
    duration: number; // seconds
    calories: number;
    distance?: number;
    date: string;
    timestamp: string;
}

export interface DailyActivity {
    date: string;
    calories: number; // Active calories
    totalCalories: number; // Active + BMR
    steps: number;
}

interface WithingsState {
    isConnected: boolean;
    loading: boolean;
    hasChecked: boolean;
    sleepData: SleepData | null;
    weeklySleepData: SleepData[];
    workouts: WithingsWorkout[];
    vitals: VitalData | null;
    weeklyVitals: VitalData[];
    intradayHR: IntradayHeartRate[];
    dailyActivity: DailyActivity | null;
    weeklyActivity: DailyActivity[];
    fetchVitalData: () => Promise<void>;
    fetchIntradayHR: () => Promise<void>;
    connect: () => void;
    exchangeCode: (code: string) => Promise<void>;
    fetchSleepData: () => Promise<void>;
    fetchWorkoutData: () => Promise<void>;
    fetchDailyActivity: () => Promise<void>;
    checkConnection: () => Promise<void>;
    disconnect: () => Promise<void>;
}

const CLIENT_ID = import.meta.env.VITE_WITHINGS_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_WITHINGS_CLIENT_SECRET;
const REDIRECT_URI = window.location.origin + '/withings-callback';

export const useWithingsStore = create<WithingsState>((set) => {

    const getTokens = async (): Promise<WithingsTokens | null> => {
        const user = useAuth.getState().user;
        if (!user) return null;

        const docRef = doc(db, 'user_integrations', `${user.uid}_withings`);
        const snap = await getDoc(docRef);
        return snap.exists() ? snap.data() as WithingsTokens : null;
    };

    const saveTokens = async (data: any) => {
        const user = useAuth.getState().user;
        if (!user) return;

        const tokens: WithingsTokens = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            userid: data.userid,
            expires_at: Date.now() + (data.expires_in * 1000)
        };

        await setDoc(doc(db, 'user_integrations', `${user.uid}_withings`), tokens);
        set({ isConnected: true });
    };

    const refreshTokens = async (refreshToken: string) => {
        const params = new URLSearchParams();
        params.append('action', 'requesttoken');
        params.append('grant_type', 'refresh_token');
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);
        params.append('refresh_token', refreshToken);

        const res = await fetch('/api/withings/v2/oauth2', {
            method: 'POST',
            body: params
        });

        const data = await res.json();
        if (data.status !== 0) throw new Error('Failed to refresh tokens');
        await saveTokens(data.body);
        return data.body.access_token;
    };

    return {
        isConnected: false,
        loading: false,
        hasChecked: false,
        sleepData: null,
        weeklySleepData: [],
        workouts: [],
        vitals: null,
        weeklyVitals: [],
        intradayHR: [],
        dailyActivity: null,
        weeklyActivity: [],

        connect: () => {
            const scope = encodeURIComponent('user.info,user.metrics,user.activity,user.heart,user.sleepevents');
            const state = 'withings_auth_' + Math.random().toString(36).substring(7);
            localStorage.setItem('withings_auth_state', state);

            const url = `https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=${CLIENT_ID}&state=${state}&scope=${scope}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&prompt=consent`;
            window.location.href = url;
        },

        exchangeCode: async (code: string) => {
            set({ loading: true });
            try {
                const params = new URLSearchParams();
                params.append('action', 'requesttoken');
                params.append('grant_type', 'authorization_code');
                params.append('client_id', CLIENT_ID);
                params.append('client_secret', CLIENT_SECRET);
                params.append('code', code);
                params.append('redirect_uri', REDIRECT_URI);

                const res = await fetch('/api/withings/v2/oauth2', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: params.toString()
                });

                const data = await res.json();

                if (data.status === 0) {
                    await saveTokens(data.body);
                } else {
                    console.error("Withings Exchange Error", data);
                    throw new Error("Failed to exchange code");
                }
            } finally {
                set({ loading: false });
            }
        },

        checkConnection: async () => {
            set({ loading: true });
            try {
                const tokens = await getTokens();
                set({ isConnected: !!tokens, hasChecked: true });
            } finally {
                set({ loading: false, hasChecked: true });
            }
        },

        disconnect: async () => {
            const user = useAuth.getState().user;
            if (user) {
                await deleteDoc(doc(db, 'user_integrations', `${user.uid}_withings`));
                set({ isConnected: false, sleepData: null });
            }
        },

        fetchSleepData: async () => {
            let tokens = await getTokens();
            if (!tokens) return;

            set({ loading: true });
            try {
                // Refresh token if expired (giving a 5 minute buffer)
                if (Date.now() > tokens.expires_at - 300000) {
                    const newAccess = await refreshTokens(tokens.refresh_token);
                    tokens.access_token = newAccess;
                }


                const sleepParams = new URLSearchParams({
                    action: 'getsummary',
                    startdateymd: format(subDays(new Date(), 14), 'yyyy-MM-dd'),
                    enddateymd: format(new Date(), 'yyyy-MM-dd'),
                    data_fields: 'hr_average,hr_min,hr_max,rmssd,sdnn_1,respiration_rate_average,night_events,sleep_score,total_sleep_time,lightsleepduration,deepsleepduration,remsleepduration,wakeupduration'
                });

                const res = await fetch(`/api/withings/v2/sleep?${sleepParams.toString()}`, {
                    headers: {
                        'Authorization': `Bearer ${tokens.access_token}`
                    }
                });

                const data = await res.json();
                console.log("Withings Sleep Summary raw response:", data);
                if (data.status === 0 && data.body.series && data.body.series.length > 0) {
                    console.log("RAW SLEEP DATA FOR DIAGNOSTIC (First Item):", data.body.series[0].data);
                    const series = data.body.series;

                    const parsedData = series.map((item: any) => {
                        const dataFields = item.data || {};
                        // Log all available keys for this day to identify non-standard HRV fields
                        console.log(`FULL DATA AUDIT for ${item.date}:`, Object.keys(dataFields));

                        return {
                            date: item.date,
                            duration: dataFields.total_sleep_time || 0,
                            score: dataFields.sleep_score || 0,
                            light: dataFields.lightsleepduration || 0,
                            deep: dataFields.deepsleepduration || 0,
                            rem: dataFields.remsleepduration || 0,
                            awake: dataFields.wakeupduration || 0,
                            resting_hr: dataFields.hr_average || dataFields.hr_min || 0,
                            hr_min: dataFields.hr_min || 0,
                            hr_avg: dataFields.hr_average || 0,
                            hrv: dataFields.rmssd || dataFields.sdnn_1 || 0,
                            respiration_rate: dataFields.respiration_rate_average || 0,
                        };
                    });

                    // Grab the most recent sleep record
                    const latest = parsedData[parsedData.length - 1];

                    set({
                        sleepData: latest,
                        weeklySleepData: parsedData,
                    });
                } else if (data.status !== 0) {
                    // if token was somehow invalid beyond expiry
                    console.error("Withings fetch error:", data);
                }
            } catch (err) {
                console.error("Failed to fetch sleep data", err);
            } finally {
                set({ loading: false });
            }
        },

        fetchWorkoutData: async () => {
            let tokens = await getTokens();
            if (!tokens) return;

            set({ loading: true });
            try {
                // Refresh token if expired
                if (Date.now() > tokens.expires_at - 300000) {
                    const newAccess = await refreshTokens(tokens.refresh_token);
                    tokens.access_token = newAccess;
                }

                const workoutParams = new URLSearchParams({
                    action: 'getworkouts',
                    startdateymd: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
                    enddateymd: format(new Date(), 'yyyy-MM-dd'),
                });

                const res = await fetch(`/api/withings/v2/measure?${workoutParams.toString()}`, {
                    headers: {
                        'Authorization': `Bearer ${tokens.access_token}`
                    }
                });

                const data = await res.json();
                console.log("Withings Workout raw response:", data);
                if (data.status === 0 && data.body.series) {
                    const workouts = data.body.series.map((item: any) => ({
                        id: item.id,
                        category: item.category,
                        duration: (item.enddate - item.startdate) || 0,
                        calories: item.data?.calories || 0,
                        distance: item.data?.distance || 0,
                        date: item.date,
                        timestamp: new Date(item.startdate * 1000).toISOString()
                    }));

                    set({ workouts: workouts.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) });
                }
            } catch (err) {
                console.error("Failed to fetch workout data", err);
            } finally {
                set({ loading: false });
            }
        },

        fetchVitalData: async () => {
            let tokens = await getTokens();
            if (!tokens) return;

            set({ loading: true });
            try {
                if (Date.now() > tokens.expires_at - 300000) {
                    const newAccess = await refreshTokens(tokens.refresh_token);
                    tokens.access_token = newAccess;
                }

                // Types: 11 (HR), 71 (Temp), 130+ (Vitals)
                const vitalParams = new URLSearchParams({
                    action: 'getmeas',
                    meastypes: '11,71',
                    category: '1', // real measures
                    startdate: Math.floor(subDays(new Date(), 14).getTime() / 1000).toString(),
                    enddate: Math.floor(new Date().getTime() / 1000).toString(),
                });

                const res = await fetch(`/api/withings/v2/measure?${vitalParams.toString()}`, {
                    headers: { 'Authorization': `Bearer ${tokens.access_token}` }
                });

                const data = await res.json();
                console.log("Withings Vitals raw response:", data);

                if (data.status === 0 && data.body.measuregrps) {
                    const groups = data.body.measuregrps;
                    const dailyVitals: Record<string, VitalData> = {};

                    groups.forEach((group: any) => {
                        const date = format(new Date(group.date * 1000), 'yyyy-MM-dd');
                        if (!dailyVitals[date]) dailyVitals[date] = { date };

                        group.measures.forEach((m: any) => {
                            const value = m.value * Math.pow(10, m.unit);
                            if (m.type === 71) dailyVitals[date].temp = value;
                            if (m.type === 11) dailyVitals[date].rhr = value;
                        });
                    });

                    const sortedVitals = Object.values(dailyVitals).sort((a, b) => a.date.localeCompare(b.date));
                    set({ 
                        vitals: sortedVitals[sortedVitals.length - 1] || null,
                        weeklyVitals: sortedVitals 
                    });
                }
            } catch (err) {
                console.error("Failed to fetch vitals data", err);
            } finally {
                set({ loading: false });
            }
        },

        fetchIntradayHR: async () => {
            let tokens = await getTokens();
            if (!tokens) return;

            set({ loading: true });
            try {
                if (Date.now() > tokens.expires_at - 300000) {
                    const newAccess = await refreshTokens(tokens.refresh_token);
                    tokens.access_token = newAccess;
                }

                // Fetch last 12 hours of heart rate data (intraday)
                const hrParams = new URLSearchParams({
                    action: 'getmeas',
                    meastypes: '11',
                    category: '1',
                    startdate: Math.floor(subDays(new Date(), 1).getTime() / 1000).toString(),
                    enddate: Math.floor(new Date().getTime() / 1000).toString(),
                });

                const res = await fetch(`/api/withings/v2/measure?${hrParams.toString()}`, {
                    headers: { 'Authorization': `Bearer ${tokens.access_token}` }
                });

                const data = await res.json();
                if (data.status === 0 && data.body.measuregrps) {
                    const hrData: IntradayHeartRate[] = data.body.measuregrps
                        .filter((g: any) => g.measures.some((m: any) => m.type === 11))
                        .map((g: any) => ({
                            timestamp: new Date(g.date * 1000).toISOString(),
                            hr: g.measures.find((m: any) => m.type === 11).value * Math.pow(10, g.measures.find((m: any) => m.type === 11).unit)
                        }))
                        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                    
                    set({ intradayHR: hrData });
                }
            } catch (err) {
                console.error("Failed to fetch intraday HR data", err);
            } finally {
                set({ loading: false });
            }
        },

        fetchDailyActivity: async () => {
            let tokens = await getTokens();
            if (!tokens) return;

            set({ loading: true });
            try {
                if (Date.now() > tokens.expires_at - 300000) {
                    const newAccess = await refreshTokens(tokens.refresh_token);
                    tokens.access_token = newAccess;
                }

                const activityParams = new URLSearchParams({
                    action: 'getactivity',
                    startdateymd: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
                    enddateymd: format(new Date(), 'yyyy-MM-dd'),
                    data_fields: 'steps,calories,totalcalories'
                });

                const res = await fetch(`/api/withings/v2/measure?${activityParams.toString()}`, {
                    headers: { 'Authorization': `Bearer ${tokens.access_token}` }
                });

                const data = await res.json();
                if (data.status === 0 && data.body.activities) {
                    const activities: DailyActivity[] = data.body.activities.map((a: any) => ({
                        date: a.date,
                        calories: a.calories || 0,
                        totalCalories: a.totalcalories || a.calories || 0,
                        steps: a.steps || 0
                    }));

                    set({ 
                        dailyActivity: activities[activities.length - 1] || null,
                        weeklyActivity: activities 
                    });
                }
            } catch (err) {
                console.error("Failed to fetch daily activity:", err);
            } finally {
                set({ loading: false });
            }
        }
    };
});
