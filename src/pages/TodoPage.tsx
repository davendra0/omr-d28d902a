import { useState, useMemo } from 'react';
import {
  getTodos, addTodo, updateTodo, deleteTodo,
  getSavedTags, saveTags,
  type Todo, COLOR_CLASSES,
} from '@/lib/todoStore';

const PRIORITIES = ['low', 'medium', 'high'] as const;
const PRIORITY_ICONS: Record<string, string> = { low: '🟢', medium: '🟡', high: '🔴' };
const COLOR_OPTIONS = ['none', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];
const COLOR_DOTS: Record<string, string> = {
  none: 'bg-muted', red: 'bg-destructive', orange: 'bg-[hsl(25,95%,53%)]',
  yellow: 'bg-accent', green: 'bg-[hsl(142,71%,40%)]', blue: 'bg-primary',
  purple: 'bg-[hsl(262,83%,58%)]', pink: 'bg-[hsl(330,81%,60%)]',
};

type Filter = 'all' | 'active' | 'completed' | 'today' | 'overdue';

const TodoPage = () => {
  const [todos, setTodos] = useState<Todo[]>(getTodos);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    todos.forEach(t => t.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [todos]);

  const filtered = useMemo(() => {
    let list = todos;
    if (filter === 'active') list = list.filter(t => !t.completed);
    if (filter === 'completed') list = list.filter(t => t.completed);
    if (filter === 'today') list = list.filter(t => t.dueDate === today);
    if (filter === 'overdue') list = list.filter(t => !t.completed && t.dueDate && t.dueDate < today);
    if (tagFilter) list = list.filter(t => t.tags.includes(tagFilter));
    return list;
  }, [todos, filter, tagFilter, today]);

  const handleAdd = (todo: Todo) => {
    addTodo(todo);
    setTodos(getTodos());
    setShowAdd(false);
    // Save tags
    const existing = getSavedTags();
    saveTags([...existing, ...todo.tags]);
  };

  const handleToggle = (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    setTodos(updateTodo(id, { completed: !todo.completed, completedAt: !todo.completed ? Date.now() : undefined }));
  };

  const handleDelete = (id: string) => {
    setTodos(deleteTodo(id));
  };

  const handleUpdate = (id: string, updates: Partial<Todo>) => {
    setTodos(updateTodo(id, updates));
    setEditingId(null);
  };

  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    overdue: todos.filter(t => !t.completed && t.dueDate && t.dueDate < today).length,
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono text-foreground">✅ Tasks</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.completed}/{stats.total} done{stats.overdue > 0 && <span className="text-destructive"> · {stats.overdue} overdue</span>}
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">
          + Add Task
        </button>
      </div>

      {showAdd && <AddTodoForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} savedTags={allTags} />}

      {/* Filters */}
      <div className="flex gap-1 flex-wrap">
        {(['all', 'active', 'completed', 'today', 'overdue'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'completed' ? 'Done' : f === 'today' ? 'Today' : 'Overdue'}
          </button>
        ))}
        {allTags.length > 0 && (
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}
            className="h-7 px-2 border border-border rounded-lg bg-background text-foreground text-xs">
            <option value="">All Tags</option>
            {allTags.map(t => <option key={t} value={t}>#{t}</option>)}
          </select>
        )}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {filter === 'all' ? 'No tasks yet. Add one above!' : 'No tasks match this filter.'}
          </div>
        )}
        {filtered.map(todo => (
          editingId === todo.id ? (
            <EditTodoForm key={todo.id} todo={todo} onSave={(u) => handleUpdate(todo.id, u)} onCancel={() => setEditingId(null)} savedTags={allTags} />
          ) : (
            <TodoItem key={todo.id} todo={todo} today={today}
              onToggle={() => handleToggle(todo.id)}
              onDelete={() => handleDelete(todo.id)}
              onEdit={() => setEditingId(todo.id)}
            />
          )
        ))}
      </div>
    </div>
  );
};

function TodoItem({ todo, today, onToggle, onDelete, onEdit }: {
  todo: Todo; today: string;
  onToggle: () => void; onDelete: () => void; onEdit: () => void;
}) {
  const isOverdue = !todo.completed && todo.dueDate && todo.dueDate < today;

  return (
    <div className={`bg-card border border-border rounded-xl p-3 border-l-4 ${COLOR_CLASSES[todo.color] || ''} flex gap-3 items-start group`}>
      <button onClick={onToggle}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          todo.completed ? 'bg-primary border-primary text-primary-foreground' : 'border-border hover:border-primary'
        }`}>
        {todo.completed && <span className="text-xs">✓</span>}
      </button>

      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {PRIORITY_ICONS[todo.priority]} {todo.title}
        </div>
        {todo.description && (
          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{todo.description}</div>
        )}
        <div className="flex gap-2 mt-1.5 flex-wrap items-center">
          {todo.dueDate && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
              📅 {todo.dueDate}{todo.dueTime ? ` ${todo.dueTime}` : ''}
            </span>
          )}
          {todo.tags.map(tag => (
            <span key={tag} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">#{tag}</span>
          ))}
        </div>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onEdit} className="text-xs text-muted-foreground hover:text-foreground p-1">✏️</button>
        <button onClick={onDelete} className="text-xs text-muted-foreground hover:text-destructive p-1">🗑</button>
      </div>
    </div>
  );
}

function AddTodoForm({ onAdd, onCancel, savedTags }: { onAdd: (t: Todo) => void; onCancel: () => void; savedTags: string[] }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [color, setColor] = useState('none');
  const [priority, setPriority] = useState<Todo['priority']>('medium');

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(''); }
  };

  const submit = () => {
    if (!title.trim()) return;
    onAdd({
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      completed: false,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      tags,
      color,
      priority,
      createdAt: Date.now(),
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <input type="text" placeholder="Task title..." value={title} onChange={(e) => setTitle(e.target.value)}
        autoFocus
        className="w-full h-10 px-3 border border-border rounded-lg bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)}
        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Due Date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full h-9 px-3 border border-border rounded-lg bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Due Time</label>
          <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)}
            className="w-full h-9 px-3 border border-border rounded-lg bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Priority</label>
        <div className="flex gap-1 mt-1">
          {PRIORITIES.map(p => (
            <button key={p} onClick={() => setPriority(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${priority === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {PRIORITY_ICONS[p]} {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Color</label>
        <div className="flex gap-1.5 mt-1">
          {COLOR_OPTIONS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full ${COLOR_DOTS[c]} border-2 transition-all ${color === c ? 'border-foreground scale-110' : 'border-transparent'}`} />
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Tags</label>
        <div className="flex gap-1 flex-wrap mt-1">
          {tags.map(t => (
            <span key={t} className="text-[10px] font-mono px-2 py-1 rounded bg-primary/10 text-primary flex items-center gap-1">
              #{t}
              <button onClick={() => setTags(tags.filter(x => x !== t))} className="hover:text-destructive">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-1 mt-1">
          <input type="text" placeholder="Add tag..." value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            className="flex-1 h-8 px-2 border border-border rounded-lg bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
          {savedTags.filter(t => !tags.includes(t)).slice(0, 5).map(t => (
            <button key={t} onClick={() => setTags([...tags, t])}
              className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:text-foreground">#{t}</button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={submit} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm">Add Task</button>
        <button onClick={onCancel} className="px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted">Cancel</button>
      </div>
    </div>
  );
}

function EditTodoForm({ todo, onSave, onCancel, savedTags }: {
  todo: Todo; onSave: (u: Partial<Todo>) => void; onCancel: () => void; savedTags: string[];
}) {
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description);
  const [dueDate, setDueDate] = useState(todo.dueDate || '');
  const [dueTime, setDueTime] = useState(todo.dueTime || '');
  const [tags, setTags] = useState(todo.tags);
  const [tagInput, setTagInput] = useState('');
  const [color, setColor] = useState(todo.color);
  const [priority, setPriority] = useState(todo.priority);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(''); }
  };

  return (
    <div className="bg-card border-2 border-primary/30 rounded-xl p-4 space-y-3">
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
        className="w-full h-10 px-3 border border-border rounded-lg bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)}
        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Due Date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full h-9 px-3 border border-border rounded-lg bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Due Time</label>
          <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)}
            className="w-full h-9 px-3 border border-border rounded-lg bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Priority</label>
        <div className="flex gap-1 mt-1">
          {PRIORITIES.map(p => (
            <button key={p} onClick={() => setPriority(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${priority === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {PRIORITY_ICONS[p]} {p}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Color</label>
        <div className="flex gap-1.5 mt-1">
          {COLOR_OPTIONS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full ${COLOR_DOTS[c]} border-2 transition-all ${color === c ? 'border-foreground scale-110' : 'border-transparent'}`} />
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Tags</label>
        <div className="flex gap-1 flex-wrap mt-1">
          {tags.map(t => (
            <span key={t} className="text-[10px] font-mono px-2 py-1 rounded bg-primary/10 text-primary flex items-center gap-1">
              #{t} <button onClick={() => setTags(tags.filter(x => x !== t))} className="hover:text-destructive">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-1 mt-1">
          <input type="text" placeholder="Add tag..." value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            className="flex-1 h-8 px-2 border border-border rounded-lg bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave({ title, description, dueDate: dueDate || undefined, dueTime: dueTime || undefined, tags, color, priority })}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm">Save</button>
        <button onClick={onCancel} className="px-4 py-2 border border-border rounded-lg text-sm text-foreground hover:bg-muted">Cancel</button>
      </div>
    </div>
  );
}

export default TodoPage;
