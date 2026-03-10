import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllMistakes, MISTAKE_TYPES, type MistakeType, type QuestionAnnotation, deleteAnnotation } from '@/lib/mistakeStore';

const MistakesPage = () => {
  const navigate = useNavigate();
  const [annotations, setAnnotations] = useState<QuestionAnnotation[]>(getAllMistakes);
  const [filterType, setFilterType] = useState<MistakeType | ''>('');
  const [filterTest, setFilterTest] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const testNames = useMemo(() => [...new Set(annotations.map(a => a.testName))], [annotations]);

  const filtered = useMemo(() => {
    let list = annotations;
    if (filterType) list = list.filter(a => a.mistakeType === filterType);
    if (filterTest) list = list.filter(a => a.testName === filterTest);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.notes.toLowerCase().includes(q) || a.testName.toLowerCase().includes(q));
    }
    return list;
  }, [annotations, filterType, filterTest, searchQuery]);

  const typeStats = (Object.entries(MISTAKE_TYPES) as [MistakeType, typeof MISTAKE_TYPES[MistakeType]][]).map(([type, meta]) => ({
    type, ...meta,
    count: annotations.filter(a => a.mistakeType === type).length,
  }));

  const handleDelete = (testId: string, questionNo: number) => {
    deleteAnnotation(testId, questionNo);
    setAnnotations(getAllMistakes());
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono text-foreground">🔍 Mistake Tracker</h1>
          <p className="text-xs text-muted-foreground mt-1">{annotations.length} mistakes annotated across all tests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterType('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!filterType ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
          All ({annotations.length})
        </button>
        {typeStats.filter(s => s.count > 0).map(s => (
          <button key={s.type} onClick={() => setFilterType(filterType === s.type ? '' : s.type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterType === s.type ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
            {s.icon} {s.label} ({s.count})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input type="text" placeholder="🔍 Search notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 h-9 px-3 border border-border rounded-lg bg-background text-foreground text-sm min-w-[160px] focus:outline-none focus:ring-2 focus:ring-primary" />
        <select value={filterTest} onChange={(e) => setFilterTest(e.target.value)}
          className="h-9 px-2 border border-border rounded-lg bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All Tests</option>
          {testNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Mistakes list */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm">No mistakes annotated yet. Take a test, add answer key, then annotate wrong questions in the analysis!</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((ann) => {
          const key = `${ann.testId}_${ann.questionNo}`;
          const isExpanded = expandedId === key;
          const meta = MISTAKE_TYPES[ann.mistakeType];
          return (
            <div key={key} className="bg-card border border-border rounded-xl overflow-hidden group">
              <button
                onClick={() => setExpandedId(isExpanded ? null : key)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              >
                <span className="text-lg">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-bold text-foreground">Q.{ann.questionNo}</span>
                    <span className="text-destructive font-mono text-xs">{ann.selected}</span>
                    <span className="text-muted-foreground text-xs">→</span>
                    <span className="text-[hsl(var(--success))] font-mono text-xs">{ann.correct}</span>
                    {ann.imageData && <span className="text-xs">🖼</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-2">
                    <span className="font-mono">{ann.testName}</span>
                    <span>·</span>
                    <span className={meta.color}>{meta.label}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{isExpanded ? '🔼' : '🔽'}</span>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-border space-y-2">
                  {ann.notes && (
                    <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed bg-muted/30 rounded-lg p-3">
                      {ann.notes}
                    </pre>
                  )}
                  {ann.imageData && (
                    <img src={ann.imageData} alt={`Q.${ann.questionNo}`} className="max-w-full max-h-64 rounded-lg border border-border" />
                  )}
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                    <button onClick={() => handleDelete(ann.testId, ann.questionNo)}
                      className="text-[10px] text-muted-foreground hover:text-destructive ml-auto">
                      🗑 Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MistakesPage;
