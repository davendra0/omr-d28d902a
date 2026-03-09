import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '@/store/testStore';
import DarkModeToggle from '@/components/DarkModeToggle';
import { getSavedTests, deleteTest, renameTest, type SavedTest } from '@/lib/testHistory';

const HistoryPage = () => {
  const navigate = useNavigate();
  const { setResult, setAnswerKey } = useTestStore();
  const [tests, setTests] = useState<SavedTest[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    setTests(getSavedTests());
  }, []);

  const handleLoad = (test: SavedTest) => {
    setResult(test.result);
    if (test.answerKey) setAnswerKey(test.answerKey);
    navigate('/results');
  };

  const handleDelete = (id: string) => {
    deleteTest(id);
    setTests(getSavedTests());
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renameTest(id, editName.trim());
      setTests(getSavedTests());
      setEditingId(null);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatTime = (ms: number) => {
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono text-foreground">📋 Past Tests</h1>
        <p className="text-xs text-muted-foreground mt-1">View, rename, or reload saved tests</p>
      </div>

        {tests.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-4xl mb-3">📝</div>
            <p className="text-sm">No saved tests yet. Complete a test and save it to see it here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map((test) => {
              const r = test.result;
              const answered = r.responses.filter(q => q.selected !== null).length;
              const total = r.responses.length;
              let score: number | null = null;
              if (test.answerKey) {
                score = 0;
                r.responses.forEach(q => {
                  if (q.selected) {
                    if (test.answerKey![q.questionNo] === q.selected) score! += 4;
                    else if (test.answerKey![q.questionNo]) score! -= 1;
                  }
                });
              }

              return (
                <div
                  key={test.id}
                  className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleLoad(test)}>
                      {editingId === test.id ? (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(test.id); if (e.key === 'Escape') setEditingId(null); }}
                            autoFocus
                            className="flex-1 px-2 py-1 border border-border rounded text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <button onClick={() => handleRename(test.id)} className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-bold">✓</button>
                          <button onClick={() => setEditingId(null)} className="px-2 py-1 border border-border rounded text-xs">✗</button>
                        </div>
                      ) : (
                        <div className="font-mono font-bold text-foreground truncate">{test.name}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">{formatDate(test.savedAt)}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingId(test.id); setEditName(test.name); }}
                        className="text-muted-foreground hover:text-primary text-sm p-1"
                        title="Rename"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(test.id); }}
                        className="text-muted-foreground hover:text-destructive text-sm p-1"
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs font-mono text-muted-foreground cursor-pointer" onClick={() => handleLoad(test)}>
                    <span>{total} Q</span>
                    <span>✓ {answered}/{total}</span>
                    <span>⏱ {formatTime(r.endTime - r.startTime)}</span>
                    {score !== null && (
                      <span className="text-primary font-bold">{score}/{total * 4}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
