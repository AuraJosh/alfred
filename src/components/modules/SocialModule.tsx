import React, { useState } from 'react';
import { useSocialStore } from '../../hooks/useSocialStore';
import { useUI } from '../../context/UIContext';
import { Beer, Maximize2 } from 'lucide-react';
import { PubListModal } from './PubListModal';

export const SocialModule: React.FC = () => {
    const { pubLogs, addPubLog } = useSocialStore();
    const { addToast } = useUI();

    // Pub State
    const [pubName, setPubName] = useState("");
    const [pintPrice, setPintPrice] = useState("");
    const [atmosphere, setAtmosphere] = useState(5);
    const [pepsiMax, setPepsiMax] = useState(false);
    const [showPubListModal, setShowPubListModal] = useState(false);

    const handleAddPubLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pubName.trim() || !pintPrice) return;

        await addPubLog({
            pubName,
            pintPrice: Number(pintPrice),
            atmosphere,
            pepsiMax
        });

        // Reset form
        setPubName("");
        setPintPrice("");
        setAtmosphere(5);
        setPepsiMax(false);
        addToast("Pub trip logged successfully!", "success");
    };

    // Calculate Average Pint Price
    const avgPintPrice = pubLogs.length > 0
        ? (pubLogs.reduce((acc, curr) => acc + curr.pintPrice, 0) / pubLogs.length).toFixed(2)
        : "0.00";

    return (
        <div className="mt-8 max-w-xl">
            {/* Pub Tracker */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Beer className="w-5 h-5 text-amber-500" />
                        <h2 className="text-lg font-bold text-zinc-100">Pub Log</h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none">Avg Pint</p>
                            <p className="text-lg font-bold text-amber-500 leading-none mt-1">£{avgPintPrice}</p>
                        </div>
                        <button
                            onClick={() => setShowPubListModal(true)}
                            className="px-3 py-1.5 text-xs font-semibold text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 rounded-md transition-colors border border-amber-500/20 flex gap-2 items-center"
                        >
                            <Maximize2 className="w-3 h-3" />
                            View Pubs
                        </button>
                    </div>
                </div>

                <form onSubmit={handleAddPubLog} className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-[2]">
                            <label className="block text-xs text-zinc-500 mb-1 font-medium">Pub Name</label>
                            <input
                                type="text"
                                value={pubName}
                                onChange={(e) => setPubName(e.target.value)}
                                placeholder="e.g. The Red Lion"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-zinc-500 mb-1 font-medium">Pint Price (£)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={pintPrice}
                                onChange={(e) => setPintPrice(e.target.value)}
                                placeholder="5.50"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="block text-xs text-zinc-500 font-medium">Atmosphere Rating</label>
                            <span className="text-xs text-amber-500 font-bold">{atmosphere}/10</span>
                        </div>
                        <input
                            type="range" min="0" max="10"
                            value={atmosphere} onChange={(e) => setAtmosphere(Number(e.target.value))}
                            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <input
                            type="checkbox"
                            id="pepsiMaxCheck"
                            checked={pepsiMax}
                            onChange={(e) => setPepsiMax(e.target.checked)}
                            className="w-4 h-4 bg-zinc-900 border-zinc-800 rounded accent-amber-500 cursor-pointer"
                        />
                        <label htmlFor="pepsiMaxCheck" className="text-sm font-medium text-zinc-300 cursor-pointer select-none">
                            Pepsi Max?
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={!pubName || !pintPrice}
                        className="w-full py-2.5 mt-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-amber-900/20"
                    >
                        Save Pub Profile
                    </button>
                </form>
            </div>

            {showPubListModal && <PubListModal onClose={() => setShowPubListModal(false)} />}
        </div>
    );
};
