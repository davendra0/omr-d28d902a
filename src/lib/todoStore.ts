export interface Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  tags: string[];
  color: string; // one of COLORS keys
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  completedAt?: number;
}

const STORE_KEY = 'mydesk_todos';
const TAGS_KEY = 'mydesk_todo_tags';

export const COLORS: Record<string, string> = {
  none: 'transparent',
  red: 'hsl(0 84% 60%)',
  orange: 'hsl(25 95% 53%)',
  yellow: 'hsl(45 93% 47%)',
  green: 'hsl(142 71% 40%)',
  blue: 'hsl(221 83% 53%)',
  purple: 'hsl(262 83% 58%)',
  pink: 'hsl(330 81% 60%)',
};

export const COLOR_CLASSES: Record<string, string> = {
  none: 'border-l-transparent',
  red: 'border-l-destructive',
  orange: 'border-l-[hsl(25,95%,53%)]',
  yellow: 'border-l-accent',
  green: 'border-l-[hsl(142,71%,40%)]',
  blue: 'border-l-primary',
  purple: 'border-l-[hsl(262,83%,58%)]',
  pink: 'border-l-[hsl(330,81%,60%)]',
};

export function getTodos(): Todo[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  } catch { return []; }
}

export function saveTodos(todos: Todo[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(todos));
}

export function addTodo(todo: Todo) {
  const all = getTodos();
  all.unshift(todo);
  saveTodos(all);
}

export function updateTodo(id: string, updates: Partial<Todo>) {
  const all = getTodos().map(t => t.id === id ? { ...t, ...updates } : t);
  saveTodos(all);
  return all;
}

export function deleteTodo(id: string) {
  const all = getTodos().filter(t => t.id !== id);
  saveTodos(all);
  return all;
}

export function getSavedTags(): string[] {
  try {
    return JSON.parse(localStorage.getItem(TAGS_KEY) || '[]');
  } catch { return []; }
}

export function saveTags(tags: string[]) {
  localStorage.setItem(TAGS_KEY, JSON.stringify([...new Set(tags)]));
}
