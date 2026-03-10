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
}

interface WithingsState {
    isConnected: boolean;
    loading: boolean;
    hasChecked: boolean;
    sleepData: SleepData | null;
    weeklySleepData: SleepData[];
    connect: () => void;
    exchangeCode: (code: string) => Promise<void>;
    fetchSleepData: () => Promise<void>;
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
        }
    };
});
