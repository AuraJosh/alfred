import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, MessageSquare } from 'lucide-react';
import { useAIStore } from '../../hooks/useAIStore';

interface Message {
    role: 'user' | 'model';
    text: string;
}

export const ChatWidget: React.FC = () => {
    const { apiKey, getAIContext } = useAIStore();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([{
        role: 'model',
        text: 'Hello. I am Alfred. I have full context of all your tracking data for the past 7 days. How can I assist you today?'
    }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !apiKey) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const contextData = getAIContext();
            const systemInstruction = `You are Alfred, a practical, no-nonsense health and productivity coach. You have full context of the user's tracking data (workouts, sleep, tasks, nutrition, etc.). 
Answer their queries concisely and precisely based on the provided context. 
IMPORTANT: When the user mentions "today", refer to the data associated with the "Current Date" provided at the start of the context.
Format responses nicely using markdown.

Context:
${contextData}`;

            // Map all existing messages
            const chatHistory = messages.filter(m => m.text !== 'Hello. I am Alfred. I have full context of all your tracking data for the past 7 days. How can I assist you today?').map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            // Add the new message
            chatHistory.push({
                role: 'user',
                parts: [{ text: userMsg }]
            });

            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: systemInstruction }]
                    },
                    contents: chatHistory,
                    generationConfig: {
                        temperature: 0.7,
                    }
                })
            });

            if (!response.ok) {
                throw new Error("API Connection Failed");
            }

            const data = await response.json();
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I was unable to formulate a response.";

            setMessages(prev => [...prev, { role: 'model', text: reply }]);
        } catch (err: any) {
            console.error("Chat Error:", err);
            setMessages(prev => [...prev, { role: 'model', text: `Error: ${err.message || 'Could not reach the neural framework.'} Ensure your API key is valid.` }]);
        } finally {
            setLoading(false);
        }
    };

    if (!apiKey) return null; // Need API key from the Intelligence module

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
            {isOpen && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-[350px] sm:w-[400px] h-[500px] shadow-2xl shadow-amber-900/10 mb-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-amber-500" />
                            <h3 className="font-bold text-zinc-100 flex items-center gap-2">Alfred AI <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-amber-500/10 text-amber-400 font-bold">Online</span></h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end bg-zinc-800 text-white border-zinc-700' : 'self-start bg-black/40 border-zinc-800/80 text-zinc-300'} border rounded-xl px-4 py-3 leading-relaxed text-sm`}>
                                <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }} />
                            </div>
                        ))}
                        {loading && (
                            <div className="self-start bg-black/40 border border-zinc-800/80 text-zinc-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> Formulating response...
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 bg-zinc-900 border-t border-zinc-800">
                        <form onSubmit={handleSend} className="relative flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask Alfred..."
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-12 py-3 text-sm text-zinc-200 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || loading}
                                className="absolute right-2 p-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:hover:bg-amber-600 text-white rounded-lg transition-colors cursor-pointer"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white p-4 rounded-full shadow-2xl shadow-amber-900/30 transition-transform hover:scale-105 active:scale-95 group relative"
                >
                    <MessageSquare className="w-6 h-6" />
                    <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950"></div>
                </button>
            )}
        </div>
    );
};
