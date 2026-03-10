import React from 'react';
import { X, Beer, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useSocialStore } from '../../hooks/useSocialStore';
import { useUI } from '../../context/UIContext';

interface PubListModalProps {
    onClose: () => void;
}

export const PubListModal: React.FC<PubListModalProps> = ({ onClose }) => {
    const { pubLogs, deletePubLog } = useSocialStore();
    const { showConfirm, addToast } = useUI();

    const sortedLogs = [...pubLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const handleDelete = (id: string, pubName: string) => {
        showConfirm({
            title: "Delete Pub Log?",
            message: `Are you sure you want to permanently delete your visit to ${pubName} from the database?`,
            confirmText: "Delete",
            onConfirm: async () => {
                await deletePubLog(id);
                addToast(`Deleted ${pubName} visit`, "success");
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 rounded-t-2xl shrink-0">
                    <div className="flex items-center gap-3">
                        <Beer className="w-6 h-6 text-amber-500" />
                        <h2 className="text-xl font-bold text-zinc-100">Pub Directory</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* List Container */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {sortedLogs.length === 0 ? (
                        <div className="text-center py-12 bg-zinc-900/30 rounded-xl border border-zinc-800/50 border-dashed">
                            <Beer className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                            <p className="text-zinc-500">No pub visits logged yet. Get out there!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sortedLogs.map((log) => (
                                <div key={log.id} className="group bg-zinc-900 border border-zinc-800 rounded-xl p-4 transition-all hover:bg-zinc-800/80 hover:border-amber-500/30 relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-zinc-100 text-lg">{log.pubName}</h3>
                                            <p className="text-xs text-zinc-500 font-mono mt-0.5">{format(parseISO(log.timestamp), 'MMM do, yyyy')}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs text-zinc-500 uppercase tracking-widest block mb-1">Pint Price</span>
                                            <span className="font-bold text-amber-500 tabular-nums">£{log.pintPrice.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-zinc-800/50">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-zinc-500 font-medium tracking-wide">Atmosphere:</span>
                                            <span className="text-sm font-bold text-amber-400">{log.atmosphere}/10</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-zinc-500 font-medium tracking-wide">Pepsi Max:</span>
                                            {log.pepsiMax ? (
                                                <div className="flex items-center gap-1 text-emerald-400 text-sm font-bold">
                                                    <CheckCircle2 className="w-4 h-4" /> Yes
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-red-400/80 text-sm font-medium">
                                                    <XCircle className="w-4 h-4" /> No
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDelete(log.id, log.pubName)}
                                        title="Delete Log"
                                        className="absolute top-4 right-1/2 translate-x-12 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-colors p-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800 backdrop-blur-sm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
