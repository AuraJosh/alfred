export type TrackerType = 'BOOLEAN' | 'SCALAR' | 'COUNTER' | 'COMPLEX' | 'RATING' | 'TIMER' | 'DOUBLE_BOOLEAN';

export interface Tracker {
    id: string;
    name: string;
    type: TrackerType;
    category: string;
    visualization?: string;
    isDaysSince?: boolean;
    labels?: [string, string]; // e.g. ['Shampoo', 'Conditioner']
    goal?: {
        target: number;
        frequency: 'daily' | 'weekly' | 'monthly';
    };
    holidayPaused?: boolean;
    userId: string;
}

export interface LogEntry {
    id: string;
    trackerId: string;
    timestamp: string; // ISO string for easy serialization
    value: any; // Depends on TrackerType
    context?: string;
    location?: string;
    userId: string;
}

export interface Todo {
    id: string;
    content: string;
    status: 'todo' | 'in_progress' | 'done';
    type: 'mundane' | 'project' | 'work' | 'shopping';
    parentId?: string;
    userId: string;
    dueDate?: string;
    createdAt?: string;
    completedAt?: string;
}
