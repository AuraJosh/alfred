import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, Trash2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ConfirmPayload {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
}

interface PromptPayload {
    title: string;
    message: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: (value: string) => void;
    onCancel?: () => void;
}

interface UIContextType {
    addToast: (message: string, type?: ToastType) => void;
    showConfirm: (payload: ConfirmPayload) => void;
    showPrompt: (payload: PromptPayload) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error("useUI must be used within a UIProvider");
    return context;
};

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmPayload, setConfirmPayload] = useState<ConfirmPayload | null>(null);
    const [promptPayload, setPromptPayload] = useState<PromptPayload | null>(null);
    const [promptValue, setPromptValue] = useState("");

    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const showConfirm = useCallback((payload: ConfirmPayload) => {
        setConfirmPayload(payload);
    }, []);

    const showPrompt = useCallback((payload: PromptPayload) => {
        setPromptValue("");
        setPromptPayload(payload);
    }, []);

    const handleConfirm = () => {
        if (confirmPayload) {
            confirmPayload.onConfirm();
            setConfirmPayload(null);
        }
    };

    const handleCancelConfirm = () => {
        if (confirmPayload) {
            confirmPayload.onCancel?.();
            setConfirmPayload(null);
        }
    };

    const handlePromptSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (promptPayload && promptValue.trim()) {
            promptPayload.onConfirm(promptValue);
            setPromptPayload(null);
        }
    };

    const handlePromptCancel = () => {
        if (promptPayload) {
            promptPayload.onCancel?.();
            setPromptPayload(null);
        }
    };

    return (
        <UIContext.Provider value={{ addToast, showConfirm, showPrompt }}>
            {children}

            {/* Toasts */}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm animate-in slide-in-from-right-8 duration-300
                            ${toast.type === 'success' ? 'bg-zinc-900 border-green-500/30 text-zinc-100' :
                                toast.type === 'error' ? 'bg-zinc-900 border-red-500/30 text-zinc-100' :
                                    'bg-zinc-900 border-amber-500/30 text-zinc-100'}`}
                    >
                        {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                        {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                        {toast.type === 'info' && <Info className="w-5 h-5 text-amber-400" />}
                        {toast.message}
                    </div>
                ))}
            </div>

            {/* Confirm Dialog */}
            {confirmPayload && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4 text-red-400">
                            <AlertCircle className="w-6 h-6" />
                            <h2 className="text-lg font-bold text-zinc-100">{confirmPayload.title}</h2>
                        </div>
                        <p className="text-sm text-zinc-300 mb-6">{confirmPayload.message}</p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleCancelConfirm}
                                className="px-4 py-2 text-sm font-medium hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400"
                            >
                                {confirmPayload.cancelText || 'Cancel'}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                {confirmPayload.confirmText || 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Prompt Dialog */}
            {promptPayload && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-lg font-bold text-zinc-100 mb-2">{promptPayload.title}</h2>
                        <p className="text-sm text-zinc-400 mb-4">{promptPayload.message}</p>

                        <form onSubmit={handlePromptSubmit}>
                            <input
                                autoFocus
                                type="text"
                                value={promptValue}
                                onChange={(e) => setPromptValue(e.target.value)}
                                placeholder={promptPayload.placeholder || "Enter value..."}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors mb-6 text-zinc-100"
                            />

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handlePromptCancel}
                                    className="px-4 py-2 text-sm font-medium hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400"
                                >
                                    {promptPayload.cancelText || 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={!promptValue.trim()}
                                    className="px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                                >
                                    {promptPayload.confirmText || 'Save Entry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </UIContext.Provider>
    );
};
