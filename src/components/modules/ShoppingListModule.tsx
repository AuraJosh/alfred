import React, { useState, useEffect } from 'react';
import { useTodoStore } from '../../hooks/useTodoStore';
import { useShoppingStore } from '../../hooks/useShoppingStore';
import { useUI } from '../../context/UIContext';
import { CheckCircle2, Circle, Plus, ShoppingCart, Trash2, Edit3, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import type { Todo } from '../../types';

export const ShoppingListModule: React.FC = () => {
    const { todos, addTodo, updateTodoStatus, deleteTodo } = useTodoStore();
    const { lists, addList, updateListName, deleteList } = useShoppingStore();
    const { addToast, showConfirm } = useUI();
    const [newItem, setNewItem] = useState("");
    const [showCompleted, setShowCompleted] = useState(false);
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [isCreatingList, setIsCreatingList] = useState(false);
    const [newListName, setNewListName] = useState("");
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState("");

    // Sync selected list if none selected or if selected list was deleted
    useEffect(() => {
        if (lists.length > 0) {
            if (!selectedListId || !lists.find(l => l.id === selectedListId)) {
                setSelectedListId(lists[0].id);
            }
        } else {
            setSelectedListId(null);
        }
    }, [lists, selectedListId]);

    const selectedList = lists.find(l => l.id === selectedListId);
    const selectedListIndex = lists.findIndex(l => l.id === selectedListId);

    const items = todos.filter(t => t.type === 'shopping' && (t.listId === selectedListId || (!t.listId && !selectedListId)) && t.status !== 'done');
    const completedItems = todos.filter(t => t.type === 'shopping' && (t.listId === selectedListId || (!t.listId && !selectedListId)) && t.status === 'done');

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.trim() || !selectedListId) return;

        try {
            await addTodo({
                content: newItem,
                type: 'shopping',
                status: 'todo',
                listId: selectedListId
            });
            setNewItem("");
        } catch (err) {
            console.error("Failed to add shopping item:", err);
            addToast("Failed to add item.", "error");
        }
    };

    const handleCreateList = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newListName.trim()) return;

        try {
            await addList(newListName.trim());
            setNewListName("");
            setIsCreatingList(false);
            addToast("List created!", "success");
        } catch (err) {
            addToast("Failed to create list.", "error");
        }
    };

    const handleRenameList = async () => {
        if (!selectedListId || !editNameValue.trim()) return;
        try {
            await updateListName(selectedListId, editNameValue.trim());
            setIsEditingName(false);
            addToast("List renamed!", "success");
        } catch (err) {
            addToast("Failed to rename list.", "error");
        }
    };

    const handleDeleteList = () => {
        if (!selectedListId || !selectedList) return;
        showConfirm({
            title: "Delete List?",
            message: `Are you sure you want to delete "${selectedList.name}"? This will also remove all items in this list.`,
            confirmText: "Delete",
            onConfirm: async () => {
                try {
                    await deleteList(selectedListId);
                    addToast("List deleted", "success");
                } catch (err) {
                    addToast("Failed to delete list.", "error");
                }
            }
        });
    };

    const cycleList = (direction: 'next' | 'prev') => {
        if (lists.length <= 1) return;
        let nextIndex = direction === 'next' ? selectedListIndex + 1 : selectedListIndex - 1;
        if (nextIndex >= lists.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = lists.length - 1;
        setSelectedListId(lists[nextIndex].id);
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
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <ShoppingCart className="w-5 h-5 text-emerald-400 shrink-0" />
                    {isEditingName ? (
                        <div className="flex items-center gap-1 flex-1">
                            <input
                                autoFocus
                                value={editNameValue}
                                onChange={(e) => setEditNameValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRenameList()}
                                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-sm text-zinc-100 w-full focus:outline-none focus:border-emerald-500"
                            />
                            <button onClick={handleRenameList} className="text-emerald-400 hover:text-emerald-300">
                                <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsEditingName(false)} className="text-zinc-500 hover:text-zinc-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 overflow-hidden">
                            <h2 className="text-lg font-bold text-zinc-100 truncate">
                                {selectedList ? selectedList.name : "Shopping List"}
                            </h2>
                            {selectedList && (
                                <button 
                                    onClick={() => {
                                        setIsEditingName(true);
                                        setEditNameValue(selectedList.name);
                                    }}
                                    className="text-zinc-600 hover:text-zinc-400 transition-colors"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {lists.length > 1 && (
                        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden mr-1">
                            <button 
                                onClick={() => cycleList('prev')}
                                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border-r border-zinc-800"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => cycleList('next')}
                                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    
                    <button
                        onClick={() => setIsCreatingList(!isCreatingList)}
                        className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-emerald-400 transition-colors"
                        title="Create new list"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    
                    {selectedList && (
                         <button
                            onClick={handleDeleteList}
                            className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 transition-colors ml-1"
                            title="Delete current list"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {isCreatingList && (
                <form onSubmit={handleCreateList} className="flex gap-2 mb-4 shrink-0">
                    <input
                        autoFocus
                        type="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="New list name..."
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                    />
                    <button type="submit" disabled={!newListName.trim()} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 rounded-lg text-white text-xs font-medium">
                        Create
                    </button>
                    <button type="button" onClick={() => setIsCreatingList(false)} className="text-zinc-500 hover:text-zinc-400 px-1">
                        <X className="w-4 h-4" />
                    </button>
                </form>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4">
                {items.map(todo => <ItemRow key={todo.id} todo={todo} />)}
                {items.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-20 text-center">
                        <p className="text-sm text-zinc-500 italic">
                            {!selectedListId ? "Create a list to get started." : "List is empty."}
                        </p>
                    </div>
                )}
                
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
                    disabled={!selectedListId}
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder={selectedListId ? "Add item..." : "Select or create a list..."}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
                />
                <button type="submit" disabled={!newItem || !selectedListId} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 rounded-lg text-white font-medium transition-colors">
                    <Plus className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
};
