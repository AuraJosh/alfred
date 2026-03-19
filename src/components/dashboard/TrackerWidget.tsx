import React from 'react';
import { differenceInDays, isSameDay, subDays } from 'date-fns';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, Tooltip } from 'recharts';
import { X, Plane } from 'lucide-react';
import { useSettingsStore } from '../../hooks/useSettingsStore';
import { isWithinInterval, parseISO, startOfDay, eachDayOfInterval } from 'date-fns';
import type { Tracker, LogEntry } from '../../types';

interface TrackerWidgetProps {
    tracker: Tracker;
    logs: LogEntry[];
    onQuickLog: (trackerId: string, type: string, payload?: any) => void;
    onDelete: (trackerId: string) => void;
    onClick: (trackerId: string) => void;
}

export const TrackerWidget: React.FC<TrackerWidgetProps> = ({ tracker, logs, onQuickLog, onDelete, onClick }) => {
    const { holidayMode } = useSettingsStore();
    const isHolidayAffected = tracker.holidayPaused && holidayMode;

    // Helper: Is a specific date within the active holiday?
    const isHolidayDate = (date: Date) => {
        if (!isHolidayAffected) return false;
        return isWithinInterval(startOfDay(date), {
            start: startOfDay(parseISO(holidayMode.start)),
            end: startOfDay(parseISO(holidayMode.end))
        });
    };

    // Helper: Count holiday days between two dates
    const countHolidayDaysBetween = (start: Date, end: Date) => {
        if (!isHolidayAffected) return 0;
        try {
            const days = eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) });
            return days.filter(d => isHolidayDate(d)).length;
        } catch {
            return 0;
        }
    };
    // 1. Sort logs from oldest to newest for the chart
    const sortedLogs = [...logs].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // 2. Prepare Chart Data (Last 7 entries)
    const chartData = sortedLogs.slice(-7).map(log => ({
        value: typeof log.value === 'number' ? log.value : (log.value ? 1 : 0),
        time: new Date(log.timestamp).toLocaleDateString()
    }));

    // 3. Calculate "Days Since"
    const lastLog = sortedLogs[sortedLogs.length - 1];
    let daysSinceText = "Never";
    let isWarning = false;

    if (lastLog) {
        const lastDate = new Date(lastLog.timestamp);
        let daysSince = differenceInDays(new Date(), lastDate);

        if (isHolidayAffected) {
            const hDays = countHolidayDaysBetween(lastDate, new Date());
            daysSince = Math.max(0, daysSince - hDays);
        }

        // If it's today, say "Today". Otherwise short time ago
        if (isSameDay(new Date(), lastDate)) {
            daysSinceText = "Today";
        } else {
            const diffMs = Date.now() - lastDate.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMins / 60);

            if (daysSince > 0) {
                daysSinceText = `${daysSince}d ago`;
            } else if (diffHrs > 0) {
                daysSinceText = `${diffHrs}h ago`;
            } else if (diffMins > 0) {
                daysSinceText = `${diffMins}m ago`;
            } else {
                daysSinceText = 'Just now';
            }
        }

        // "Days Since" color coding based on threshold (e.g., > 3 days is warning)
        if (daysSince > 3) isWarning = true;
    }

    // 3.5 Calculate Current Streak
    const isDayCompleted = (date: Date) => {
        const dayLogs = logs.filter(l => isSameDay(new Date(l.timestamp), date));
        if (tracker.type === 'DOUBLE_BOOLEAN') {
            return dayLogs.some(l => l.value === 'morning') && dayLogs.some(l => l.value === 'night');
        } else if (tracker.type === 'BOOLEAN') {
            return dayLogs.some(l => l.value === true);
        } else {
            return dayLogs.length > 0;
        }
    };

    let currentStreak = 0;
    let dateToCheck = new Date();

    if (isDayCompleted(dateToCheck)) {
        currentStreak++;
        while (true) {
            dateToCheck = subDays(dateToCheck, 1);
            if (isHolidayDate(dateToCheck)) continue; // SKIP HOLIDAY DAYS
            if (isDayCompleted(dateToCheck)) {
                currentStreak++;
            } else {
                break;
            }
        }
    } else {
        // If today is a holiday, we don't break the streak by not doing it.
        // We look at the day before the holiday started.
        if (isHolidayDate(dateToCheck)) {
            // Find the first non-holiday day going backwards
            while (isHolidayDate(dateToCheck)) {
                dateToCheck = subDays(dateToCheck, 1);
            }
            // Now check that day
            while (isDayCompleted(dateToCheck)) {
                currentStreak++;
                dateToCheck = subDays(dateToCheck, 1);
                while (isHolidayDate(dateToCheck)) dateToCheck = subDays(dateToCheck, 1);
            }
        } else {
            dateToCheck = subDays(dateToCheck, 1);
            while (true) {
                if (isHolidayDate(dateToCheck)) {
                    dateToCheck = subDays(dateToCheck, 1);
                    continue;
                }
                if (isDayCompleted(dateToCheck)) {
                    currentStreak++;
                    dateToCheck = subDays(dateToCheck, 1);
                } else {
                    break;
                }
            }
        }
    }

    // 4. Calculate total/current metric based on type
    const isDoubleBoolean = tracker.type === 'DOUBLE_BOOLEAN';
    const label1 = tracker.labels?.[0] || 'Morning';
    const label2 = tracker.labels?.[1] || 'Night';

    const todaysLogs = logs.filter(l => isSameDay(new Date(), new Date(l.timestamp)));
    const morningLog = todaysLogs.find(l => l.value === 'morning');
    const nightLog = todaysLogs.find(l => l.value === 'night');
    const hasMorning = !!morningLog;
    const hasNight = !!nightLog;

    let currentMetric: string | number = "--";
    if (tracker.isDaysSince) {
        if (lastLog) {
            const lastLogDate = new Date(lastLog.timestamp);
            if (isSameDay(new Date(), lastLogDate)) {
                currentMetric = "Today";
            } else {
                let days = differenceInDays(new Date(), lastLogDate);
                if (isHolidayAffected) {
                    const hDays = countHolidayDaysBetween(lastLogDate, new Date());
                    days = Math.max(0, days - hDays);
                }
                currentMetric = `${days > 0 ? days : 1}d`;
            }
        } else {
            currentMetric = "--";
        }
    } else if (isDoubleBoolean) {
        currentMetric = `${(hasMorning ? 1 : 0) + (hasNight ? 1 : 0)}/2`;
    } else if (tracker.type === 'SCALAR' && lastLog) {
        currentMetric = lastLog.value;
    } else if (tracker.type === 'COUNTER') {
        currentMetric = logs.reduce((acc, log) => acc + (Number(log.value) || 0), 0);
    } else if (tracker.type === 'BOOLEAN' && lastLog) {
        currentMetric = lastLog.value ? 'Done' : 'Missed';
    }

    return (
        <div
            onClick={() => onClick(tracker.id)}
            className="p-5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-xl flex flex-col justify-between group flex-1 cursor-pointer transition-colors"
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-semibold text-zinc-100">{tracker.name}</h3>
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">{tracker.category}</span>
                </div>
                <div className="text-right flex items-center gap-2">
                    {currentStreak > 0 && (
                        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-orange-500/10 text-orange-400 flex items-center gap-1" title="Current Streak">
                            🔥 {currentStreak}
                        </span>
                    )}
                    {tracker.holidayPaused && (
                        <span 
                            className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 transition-all ${isHolidayDate(new Date()) ? 'bg-indigo-500 text-white animate-pulse' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`} 
                            title={isHolidayDate(new Date()) ? "Holiday Mode: ACTIVE" : "Holiday Mode: SCHEDULED"}
                        >
                            <Plane className="w-3 h-3" />
                            {isHolidayDate(new Date()) && <span className="text-[8px] ml-0.5">ACTIVE</span>}
                        </span>
                    )}
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${isWarning ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                        {daysSinceText}
                    </span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(tracker.id); }}
                        className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Metric & Viz Area */}
            <div className="flex items-center gap-4 my-4">
                <div className="text-2xl font-bold text-white min-w-16">
                    {currentMetric}
                </div>

                {/* Tiny Sparkline Chart OR custom layout */}
                <div className="h-12 flex-1 relative">
                    {tracker.visualization === 'none' ? (
                        <div className="w-full h-full flex flex-col justify-center items-end pr-2">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
                                <span className="text-xl leading-none">🔥</span>
                                <span className="font-bold tracking-wide">{currentStreak} Day Streak</span>
                            </div>
                        </div>
                    ) : isDoubleBoolean ? (
                        <div className="w-full h-full flex flex-col justify-center items-end gap-1.5 pr-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-400 font-medium">{hasMorning ? new Date(morningLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                <span className="text-[9px] text-zinc-500 uppercase tracking-widest leading-none max-w-[40px] text-right truncate overflow-hidden" title={label1}>{label1}</span>
                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 border ${hasMorning ? 'border-green-500 bg-green-500' : 'border-zinc-700 bg-zinc-800'}`}></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-400 font-medium">{hasNight ? new Date(nightLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                <span className="text-[9px] text-zinc-500 uppercase tracking-widest leading-none max-w-[40px] text-right truncate overflow-hidden" title={label2}>{label2}</span>
                                <div className={`w-2.5 h-2.5 rounded-full shrink-0 border ${hasNight ? 'border-amber-500 bg-amber-500' : 'border-zinc-700 bg-zinc-800'}`}></div>
                            </div>
                        </div>
                    ) : chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            {tracker.visualization === 'streak' || tracker.type === 'COUNTER' ? (
                                <BarChart data={chartData} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', fontSize: '12px' }}
                                        itemStyle={{ color: '#3b82f6' }}
                                        labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                                    />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                                </BarChart>
                            ) : (
                                <AreaChart data={chartData} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                                    <defs>
                                        <linearGradient id={`color-${tracker.id}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Tooltip
                                        cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }}
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', fontSize: '12px' }}
                                        itemStyle={{ color: '#3b82f6' }}
                                        labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill={`url(#color-${tracker.id})`} />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600 italic">No data</div>
                    )}
                </div>
            </div>

            {/* Action Button */}
            {isDoubleBoolean ? (
                <div className="mt-auto flex gap-2 w-full">
                    <button
                        onClick={(e) => { e.stopPropagation(); onQuickLog(tracker.id, tracker.type, 'morning'); }}
                        disabled={hasMorning || tracker.holidayPaused}
                        className="flex-1 py-1.5 px-1 truncate bg-green-500/10 hover:bg-green-500/20 disabled:opacity-50 disabled:hover:bg-green-500/10 text-green-400 font-medium rounded-lg text-xs transition-colors border border-green-500/20"
                        title={label1}
                    >
                        {tracker.holidayPaused ? 'FROZEN' : label1}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onQuickLog(tracker.id, tracker.type, 'night'); }}
                        disabled={hasNight || tracker.holidayPaused}
                        className="flex-1 py-1.5 px-1 truncate bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 disabled:hover:bg-amber-500/10 text-amber-400 font-medium rounded-lg text-xs transition-colors border border-amber-500/20"
                        title={label2}
                    >
                        {tracker.holidayPaused ? 'FROZEN' : label2}
                    </button>
                </div>
            ) : (
                <button
                    onClick={(e) => { e.stopPropagation(); onQuickLog(tracker.id, tracker.type); }}
                    disabled={tracker.holidayPaused}
                    className="mt-auto w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-medium rounded-lg text-sm transition-colors border border-amber-500/20 disabled:opacity-50 disabled:border-zinc-800 disabled:text-zinc-600"
                >
                    {tracker.holidayPaused ? 'TRIP ACTIVE - FROZEN' : 'Log Entry +'}
                </button>
            )}
        </div>
    );
};
