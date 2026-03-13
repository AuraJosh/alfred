import React, { useState } from 'react';
import { useStudyStore } from '../../hooks/useStudyStore';
import { useUI } from '../../context/UIContext';
import { CheckCircle2, Circle, Plus, Trash2, FolderDot, Maximize2, Minimize2 } from 'lucide-react';

interface StudyChecklistProps {
    subject: string;
}

export const StudyChecklist: React.FC<StudyChecklistProps> = ({ subject }) => {
    const { tasks, addTask, toggleTask, deleteTask } = useStudyStore();
    const { showConfirm } = useUI();

    const [newTaskContent, setNewTaskContent] = useState('');
    const [newTaskModule, setNewTaskModule] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    // Filter tasks by current subject
    const subjectTasks = tasks.filter(t => t.subject === subject);

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskContent.trim()) return;
        await addTask(subject, newTaskModule.trim() || 'General', newTaskContent.trim());
        setNewTaskContent('');
        setNewTaskModule('');
    };

    const renderContent = (isModal: boolean) => {
        const MAX_INLINE = 5;
        const activeTasks = subjectTasks
            .filter(t => !t.isCompleted)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const completedTasks = subjectTasks
            .filter(t => t.isCompleted)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const displayTasks = isModal ? activeTasks : activeTasks.slice(0, MAX_INLINE);
        const hasMore = !isModal && (activeTasks.length > MAX_INLINE || completedTasks.length > 0);
        const hiddenCount = (activeTasks.length - displayTasks.length) + completedTasks.length;

        // Group tasks by category
        const tasksByModule = displayTasks.reduce((acc, task) => {
            const mod = task.module || 'Uncategorized';
            if (!acc[mod]) acc[mod] = [];
            acc[mod].push(task);
            return acc;
        }, {} as Record<string, typeof subjectTasks>);

        const TaskItem = ({ task }: { task: typeof subjectTasks[0] }) => (
            <div key={task.id} className="group flex flex-col py-2 border-b border-zinc-800/30 last:border-0 pl-1">
                <div className="flex items-start gap-3 w-full">
                    <button
                        onClick={() => toggleTask(task.id, !task.isCompleted)}
                        className="mt-0.5 shrink-0 text-zinc-500 hover:text-indigo-400 transition-colors"
                    >
                        {task.isCompleted ? <CheckCircle2 className="w-5 h-5 text-indigo-500" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <span className={`flex-1 text-sm ${task.isCompleted ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
                        {task.content}
                    </span>
                    <button
                        onClick={() => {
                            showConfirm({
                                title: "Delete Task?",
                                message: "Are you sure you want to permanently delete this task from the database?",
                                confirmText: "Delete",
                                onConfirm: () => deleteTask(task.id)
                            });
                        }}
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-colors bg-zinc-900 p-1 rounded"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                {task.createdAt && (
                    <div className="flex gap-3 pl-8 text-[10px] text-zinc-500 font-mono mt-1 group-hover:opacity-100 opacity-60">
                        <span>Added: {new Date(task.createdAt).toLocaleDateString()}</span>
                        {task.completedAt && <span>• Done: {new Date(task.completedAt).toLocaleDateString()}</span>}
                    </div>
                )}
            </div>
        );

        return (
            <>
                <form onSubmit={handleAddTask} className="flex gap-2 mb-4 shrink-0">
                    <input
                        type="text"
                        value={newTaskModule}
                        onChange={(e) => setNewTaskModule(e.target.value)}
                        placeholder="Category (e.g. Calculus)"
                        className="w-1/3 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <input
                        type="text"
                        value={newTaskContent}
                        onChange={(e) => setNewTaskContent(e.target.value)}
                        placeholder="New to-do item..."
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <button
                        type="submit"
                        disabled={!newTaskContent.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3 py-2 rounded-lg text-white transition-colors flex items-center justify-center shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </form>

                <div className={`flex-1 pr-2 space-y-4 ${isModal ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden'}`}>
                    {Object.keys(tasksByModule).length === 0 ? (
                        <div className="text-center text-zinc-600 text-sm italic mt-8">
                            No active tasks for {subject}.
                        </div>
                    ) : (
                        Object.keys(tasksByModule).sort().map(mod => (
                            <div key={mod} className="space-y-1">
                                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest border-b border-zinc-800/50 pb-1 mb-1">{mod}</h3>
                                {tasksByModule[mod].map(task => <TaskItem key={task.id} task={task} />)}
                            </div>
                        ))
                    )}

                    {isModal && completedTasks.length > 0 && (
                        <div className="mt-8 pt-4 border-t border-zinc-800/50">
                            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest border-zinc-800/50 pb-1 mb-2">Completed Tasks</h3>
                            <div className="space-y-1 opacity-70">
                                {completedTasks.map(task => <TaskItem key={task.id} task={task} />)}
                            </div>
                        </div>
                    )}

                    {hasMore && (
                        <button
                            type="button"
                            onClick={() => setIsExpanded(true)}
                            className="w-full text-center flex items-center justify-center text-xs font-semibold text-zinc-500 hover:text-indigo-400 mt-2 cursor-pointer transition-colors py-3 border border-dashed border-zinc-800 rounded-lg bg-zinc-900/40 hover:bg-zinc-900"
                        >
                            ... {hiddenCount} more task{hiddenCount !== 1 ? 's' : ''} hidden. Click to expand
                        </button>
                    )}
                </div>
            </>
        );
    };

    if (isExpanded) {
        return (
            <>
                {/* Normal Widget stays in background maintaining layout */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col h-full min-h-[400px]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <FolderDot className="w-5 h-5 text-indigo-400" />
                            <h2 className="text-lg font-bold text-zinc-100">{subject} Checklist</h2>
                        </div>
                    </div>
                    <div className="flex-1 bg-zinc-900/20 rounded-lg animate-pulse" />
                </div>

                {/* Popout Modal */}
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col h-[85vh] p-6">
                        <div className="flex justify-between items-center mb-6 shrink-0 border-b border-zinc-800 pb-4">
                            <div className="flex items-center gap-3">
                                <FolderDot className="w-6 h-6 text-indigo-400" />
                                <h2 className="text-xl font-bold text-zinc-100">{subject} Checklist Overview</h2>
                            </div>
                            <button onClick={() => setIsExpanded(false)} className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors flex gap-2 items-center text-xs font-semibold">
                                <Minimize2 className="w-4 h-4" />
                                Minimise
                            </button>
                        </div>
                        {renderContent(true)}
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col h-full min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <FolderDot className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-bold text-zinc-100">{subject} Checklist</h2>
                </div>
                <button
                    onClick={() => setIsExpanded(true)}
                    className="p-1.5 text-zinc-500 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors"
                    title="Pop out checklist"
                >
                    <Maximize2 className="w-4 h-4" />
                </button>
            </div>

            {renderContent(false)}
        </div>
    );
};
