import React, { useState } from 'react';
import { useTodoStore } from '../../hooks/useTodoStore';
import { useUI } from '../../context/UIContext';
import { CheckCircle2, Circle, Plus, ListTodo, Trash2 } from 'lucide-react';
import type { Todo } from '../../types';

export const TodoModule: React.FC = () => {
    const { todos, addTodo, updateTodoStatus, deleteTodo } = useTodoStore();
    const { addToast, showConfirm } = useUI();
    const [newRoutine, setNewRoutine] = useState("");
    const [showCompletedRoutines, setShowCompletedRoutines] = useState(false);

    const routines = todos.filter(t => t.type === 'mundane' && t.status !== 'done');
    const completedRoutines = todos.filter(t => t.type === 'mundane' && t.status === 'done');

    const handleAddRoutine = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoutine.trim()) return;

        try {
            await addTodo({
                content: newRoutine,
                type: 'mundane',
                status: 'todo',
            });
            setNewRoutine("");
        } catch (err) {
            console.error("Failed to add routine:", err);
            addToast("Failed to add task.", "error");
        }
    };

    const toggleStatus = (id: string, currentStatus: string) => {
        updateTodoStatus(id, currentStatus === 'done' ? 'todo' : 'done');
    };

    const TodoItem = ({ todo }: { todo: Todo }) => (
        <div className={`flex flex-col p-3 rounded-lg border group mb-2 ${todo.status === 'done' ? 'bg-zinc-900/50 border-zinc-900' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-start justify-between w-full">
                <div className="flex gap-3">
                    <button onClick={() => toggleStatus(todo.id, todo.status)} className="mt-0.5 pointer focus:outline-none">
                        {todo.status === 'done' ? (
                            <CheckCircle2 className="w-5 h-5 text-zinc-500" />
                        ) : (
                            <Circle className="w-5 h-5 text-zinc-400 group-hover:text-amber-400 transition-colors" />
                        )}
                    </button>
                    <div className={`text-sm ${todo.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                        {todo.content}
                    </div>
                </div>
                <button
                    onClick={() => {
                        showConfirm({
                            title: "Delete Task?",
                            message: "Are you sure you want to permanently delete this task from the database?",
                            confirmText: "Delete",
                            onConfirm: () => deleteTodo(todo.id)
                        });
                    }}
                    className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all focus:outline-none shrink-0"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            {todo.createdAt && (
                <div className="flex gap-3 pl-8 text-[10px] text-zinc-500 font-mono mt-2 group-hover:opacity-100 opacity-60">
                    <span>Added: {new Date(todo.createdAt).toLocaleDateString()}</span>
                    {todo.completedAt && <span>• Done: {new Date(todo.completedAt).toLocaleDateString()}</span>}
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-2xl mt-8">
            {/* 
        Routine / Mundane
        These are small tasks that might reset daily. We keep the UI very compact here.
      */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <ListTodo className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-bold text-zinc-100">Daily Execution Log</h2>
                </div>

                <div className="mb-4">
                    {routines.map(todo => <TodoItem key={todo.id} todo={todo} />)}
                    {routines.length === 0 && <p className="text-sm text-zinc-500 italic">No chores right now.</p>}
                </div>

                <form onSubmit={handleAddRoutine} className="flex gap-2 mb-2">
                    <input
                        type="text"
                        value={newRoutine}
                        onChange={(e) => setNewRoutine(e.target.value)}
                        placeholder="Add routine task..."
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <button type="submit" disabled={!newRoutine} className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 px-3 rounded-lg text-white font-medium transition-colors">
                        <Plus className="w-4 h-4" />
                    </button>
                </form>

                {completedRoutines.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-zinc-800/50">
                        <button
                            onClick={() => setShowCompletedRoutines(!showCompletedRoutines)}
                            className="text-xs font-semibold text-zinc-500 hover:text-amber-400 transition-colors w-full text-left"
                        >
                            {showCompletedRoutines ? "Hide Completed" : `Show Completed (${completedRoutines.length})`}
                        </button>
                        {showCompletedRoutines && (
                            <div className="mt-3 opacity-70">
                                {completedRoutines.map(todo => <TodoItem key={todo.id} todo={todo} />)}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
