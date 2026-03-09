import { useMemo, useState } from 'react';
import {
  addNoteToSubtopic,
  addSubtopic,
  deleteNote,
  deleteSubtopic,
  getChapters,
  getPriorityChapters,
  type Chapter,
  type SubtopicNote,
  updateChapter,
} from '@/lib/syllabusStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SUBJECT_LABELS: Record<Chapter['subject'], string> = {
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
};

const NOTE_TYPE_LABELS: Record<SubtopicNote['type'], string> = {
  mistake: 'Mistake',
  weak_point: 'Weak Point',
  concept: 'Concept Gap',
};

const NOTE_TYPE_STYLES: Record<SubtopicNote['type'], string> = {
  mistake: 'bg-destructive/10 text-destructive border-destructive/30',
  weak_point: 'bg-accent/15 text-accent-foreground border-accent/40',
  concept: 'bg-primary/10 text-primary border-primary/30',
};

const SyllabusPage = () => {
  const [chapters, setChapters] = useState<Chapter[]>(() => getChapters());
  const [subjectFilter, setSubjectFilter] = useState<'all' | Chapter['subject']>('all');
  const [classFilter, setClassFilter] = useState<'all' | Chapter['class']>('all');
  const [search, setSearch] = useState('');
  const [subtopicDrafts, setSubtopicDrafts] = useState<Record<string, string>>({});

  const [noteDialog, setNoteDialog] = useState<{
    open: boolean;
    chapterId: string;
    subtopicId: string;
  }>({ open: false, chapterId: '', subtopicId: '' });
  const [noteType, setNoteType] = useState<SubtopicNote['type']>('mistake');
  const [noteText, setNoteText] = useState('');

  const filtered = useMemo(() => {
    return chapters.filter((ch) => {
      const subjectOk = subjectFilter === 'all' || ch.subject === subjectFilter;
      const classOk = classFilter === 'all' || ch.class === classFilter;
      const searchOk =
        search.trim() === '' ||
        ch.name.toLowerCase().includes(search.toLowerCase()) ||
        ch.subtopics.some((s) => s.name.toLowerCase().includes(search.toLowerCase()));
      return subjectOk && classOk && searchOk;
    });
  }, [chapters, subjectFilter, classFilter, search]);

  const priorityList = useMemo(() => {
    const subject = subjectFilter === 'all' ? undefined : subjectFilter;
    return getPriorityChapters(subject).slice(0, 8);
  }, [chapters, subjectFilter]);

  const progress = useMemo(() => {
    const total = filtered.length;
    const done = filtered.filter((ch) => ch.completed).length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [filtered]);

  const updateAndSet = (next: Chapter[]) => setChapters(next);

  const handleAddSubtopic = (chapterId: string) => {
    const value = subtopicDrafts[chapterId]?.trim();
    if (!value) return;
    updateAndSet(addSubtopic(chapterId, value));
    setSubtopicDrafts((prev) => ({ ...prev, [chapterId]: '' }));
  };

  const handleSaveNote = () => {
    if (!noteDialog.chapterId || !noteDialog.subtopicId || !noteText.trim()) return;
    updateAndSet(addNoteToSubtopic(noteDialog.chapterId, noteDialog.subtopicId, noteType, noteText.trim()));
    setNoteText('');
    setNoteType('mistake');
    setNoteDialog({ open: false, chapterId: '', subtopicId: '' });
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-16">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="bg-card border border-border rounded-xl p-5">
          <h1 className="text-2xl font-bold text-foreground font-mono">Syllabus Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track chapters, subtopics, weak points, and mistakes in one systematic notebook.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-muted/30 border border-border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Chapters</p>
              <p className="text-xl font-bold font-mono text-foreground">{filtered.length}</p>
            </div>
            <div className="bg-muted/30 border border-border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-xl font-bold font-mono text-primary">{filtered.filter((c) => c.completed).length}</p>
            </div>
            <div className="bg-muted/30 border border-border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">In Progress</p>
              <p className="text-xl font-bold font-mono text-accent-foreground">{filtered.filter((c) => !c.completed).length}</p>
            </div>
            <div className="bg-muted/30 border border-border rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="text-xl font-bold font-mono text-foreground">{progress}%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chapter or subtopic"
                className="sm:col-span-2"
              />
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value as typeof subjectFilter)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="all">All Subjects</option>
                <option value="physics">Physics</option>
                <option value="chemistry">Chemistry</option>
                <option value="biology">Biology</option>
              </select>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value as typeof classFilter)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="all">All Classes</option>
                <option value="11th">Class 11th</option>
                <option value="12th">Class 12th</option>
              </select>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
              {filtered.map((chapter) => (
                <div key={chapter.id} className="border border-border rounded-lg p-3 bg-background">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{chapter.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {SUBJECT_LABELS[chapter.subject]} • Class {chapter.class}
                        {chapter.category ? ` • ${chapter.category}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={chapter.priority}
                        onChange={(e) => updateAndSet(updateChapter(chapter.id, { priority: Number(e.target.value) }))}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                      >
                        <option value={5}>P1 Highest</option>
                        <option value={4}>P2 High</option>
                        <option value={3}>P3 Medium</option>
                        <option value={2}>P4 Low</option>
                        <option value={1}>P5 Lowest</option>
                      </select>
                      <Button
                        variant={chapter.completed ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => updateAndSet(updateChapter(chapter.id, { completed: !chapter.completed }))}
                      >
                        {chapter.completed ? 'Done' : 'Mark Done'}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Input
                      value={subtopicDrafts[chapter.id] || ''}
                      onChange={(e) => setSubtopicDrafts((prev) => ({ ...prev, [chapter.id]: e.target.value }))}
                      placeholder="Add subtopic"
                    />
                    <Button onClick={() => handleAddSubtopic(chapter.id)} size="sm">Add</Button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {chapter.subtopics.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No subtopics yet.</p>
                    ) : (
                      chapter.subtopics.map((st) => (
                        <div key={st.id} className="rounded-md border border-border p-2 bg-muted/20">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">{st.name}</p>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setNoteDialog({ open: true, chapterId: chapter.id, subtopicId: st.id })}
                              >
                                Add Note
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => updateAndSet(deleteSubtopic(chapter.id, st.id))}>
                                Remove
                              </Button>
                            </div>
                          </div>

                          <div className="mt-2 space-y-1">
                            {st.notes.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No notes yet.</p>
                            ) : (
                              st.notes.map((note) => (
                                <div key={note.id} className="flex items-start justify-between gap-2 rounded border border-border bg-card p-2">
                                  <div>
                                    <span className={`inline-flex rounded px-2 py-0.5 text-[10px] border ${NOTE_TYPE_STYLES[note.type]}`}>
                                      {NOTE_TYPE_LABELS[note.type]}
                                    </span>
                                    <p className="text-xs text-foreground mt-1">{note.content}</p>
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => updateAndSet(deleteNote(chapter.id, st.id, note.id))}>
                                    Delete
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="text-sm font-bold font-mono text-foreground">Priority List</h2>
            <p className="text-xs text-muted-foreground mt-1">Your highest-priority pending chapters</p>
            <div className="mt-3 space-y-2">
              {priorityList.length === 0 ? (
                <p className="text-xs text-muted-foreground">Everything is completed in this filter.</p>
              ) : (
                priorityList.map((ch) => (
                  <div key={ch.id} className="border border-border rounded-md p-2 bg-muted/20">
                    <p className="text-sm font-medium text-foreground">{ch.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {SUBJECT_LABELS[ch.subject]} • Class {ch.class} • Priority P{6 - ch.priority}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={noteDialog.open} onOpenChange={(open) => setNoteDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subtopic Note</DialogTitle>
            <DialogDescription>Add mistakes, weak points, or concept gaps as a popup snippet.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as SubtopicNote['type'])}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="mistake">Mistake</option>
              <option value="weak_point">Weak Point</option>
              <option value="concept">Concept Gap</option>
            </select>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write what went wrong, what to revise, and key reminder..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog({ open: false, chapterId: '', subtopicId: '' })}>
              Cancel
            </Button>
            <Button onClick={handleSaveNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SyllabusPage;
