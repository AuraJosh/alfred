import React, { useState } from 'react';
import { useTodoStore } from '../../hooks/useTodoStore';
import { useUI } from '../../context/UIContext';
import { CheckCircle2, Circle, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import type { Todo } from '../../types';

export const ShoppingListModule: React.FC = () => {
    const { todos, addTodo, updateTodoStatus, deleteTodo } = useTodoStore();
    const { addToast, showConfirm } = useUI();
    const [newItem, setNewItem] = useState("");
    const [showCompleted, setShowCompleted] = useState(false);

    const items = todos.filter(t => t.type === 'shopping' && t.status !== 'done');
    const completedItems = todos.filter(t => t.type === 'shopping' && t.status === 'done');

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.trim()) return;

        try {
            await addTodo({
                content: newItem,
                type: 'shopping',
                status: 'todo',
            });
            setNewItem("");
        } catch (err) {
            console.error("Failed to add shopping item:", err);
            addToast("Failed to add item.", "error");
        }
    };

    const toggleStatus = (id: string, currentStatus: string) => {
        updateTodoStatus(id, currentStatus === 'done' ? 'todo' : 'done');
    };

    const ItemRow = ({ todo }: { todo: Todo }) => (
        <div className={`flex flex-col p-3 rounded-lg border group mb-2 ${todo.status === 'done' ? 'bg-zinc-900/50 border-zinc-900' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-start justify-between w-full">
                <div className="flex gap-3">
                    <button onClick={() => toggleStatus(todo.id, todo.status)} className="mt-0.5 pointer focus:outline-none">
                        {todo.status === 'done' ? (
                            <CheckCircle2 className="w-5 h-5 text-zinc-500" />
                        ) : (
                            <Circle className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                        )}
                    </button>
                    <div className={`text-sm ${todo.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                        {todo.content}
                    </div>
                </div>
                <button
                    onClick={() => {
                        showConfirm({
                            title: "Remove from list?",
                            message: "Are you sure you want to remove this item?",
                            confirmText: "Delete",
                            onConfirm: () => deleteTodo(todo.id)
                        });
                    }}
                    className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all focus:outline-none shrink-0"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col h-[400px]">
            <div className="flex items-center gap-2 mb-4 shrink-0">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-zinc-100">Shopping List</h2>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4">
                {items.map(todo => <ItemRow key={todo.id} todo={todo} />)}
                {items.length === 0 && <p className="text-sm text-zinc-500 italic">List is empty.</p>}
                
                {completedItems.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-zinc-800/50">
                        <button
                            onClick={() => setShowCompleted(!showCompleted)}
                            className="text-xs font-semibold text-zinc-500 hover:text-emerald-400 transition-colors w-full text-left mb-2"
                        >
                            {showCompleted ? "Hide Checked" : `Show Checked (${completedItems.length})`}
                        </button>
                        {showCompleted && (
                            <div className="opacity-70">
                                {completedItems.map(todo => <ItemRow key={todo.id} todo={todo} />)}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <form onSubmit={handleAddItem} className="flex gap-2 shrink-0">
                <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Add item..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button type="submit" disabled={!newItem} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 rounded-lg text-white font-medium transition-colors">
                    <Plus className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
};
