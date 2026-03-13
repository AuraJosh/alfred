import React from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BookType, X } from 'lucide-react';
import { formatMinutes } from './StudyModule';

interface StudyAnalyticsModalProps {
    onClose: () => void;
    chartData: Array<{ date: string; minutes: number }>;
    activeTodayMins: number;
}

export const StudyAnalyticsModal: React.FC<StudyAnalyticsModalProps> = ({ onClose, chartData, activeTodayMins }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                    <div className="flex items-center gap-2 text-zinc-100">
                        <BookType className="w-5 h-5 text-purple-400" />
                        <h2 className="font-bold">Study Analytics Overview</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-zinc-300 font-semibold">Activity over Last 7 Days</h3>
                        <div className="text-right">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none">Today's Total</p>
                            <p className="text-2xl font-bold text-purple-400 leading-none mt-1">
                                {formatMinutes(activeTodayMins)}
                            </p>
                        </div>
                    </div>

                    <div className="w-full h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id="colorMinutesLarge" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" stroke="#52525b" fontSize={12} tickMargin={10} />
                                <Tooltip
                                    cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }}
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', fontSize: '14px', borderRadius: '8px' }}
                                    itemStyle={{ color: '#a855f7' }}
                                    labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                                    formatter={(value: any) => [formatMinutes(Number(value)), 'Time']}
                                />
                                <Area type="monotone" dataKey="minutes" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorMinutesLarge)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
