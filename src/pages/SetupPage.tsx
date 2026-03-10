import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '@/store/testStore';
import { getSavedTests, type SavedTest } from '@/lib/testHistory';
import { getPlannedTests, addPlannedTest, deletePlannedTest, type PlannedTest } from '@/lib/plannedTestStore';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type Tab = 'quick' | 'plan' | 'upcoming' | 'history';

const SetupPage = () => {
  const navigate = useNavigate();
  const { setConfig, startTest } = useTestStore();
  const [tab, setTab] = useState<Tab>('quick');

  // Quick start state
  const [totalQuestions, setTotalQuestions] = useState('');
  const [startFrom, setStartFrom] = useState('1');
  const [timeInMinutes, setTimeInMinutes] = useState('');

  // Plan state
  const [planName, setPlanName] = useState('');
  const [planQuestions, setPlanQuestions] = useState('');
  const [planStart, setPlanStart] = useState('1');
  const [planTime, setPlanTime] = useState('');
  const [planDate, setPlanDate] = useState<Date | undefined>(undefined);

  // Data
  const [planned, setPlanned] = useState<PlannedTest[]>([]);
  const [savedTests, setSavedTests] = useState<SavedTest[]>([]);

  useEffect(() => {
    setPlanned(getPlannedTests());
    setSavedTests(getSavedTests());
  }, []);

  const upcomingTests = planned.filter(t => !t.completed).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayTests = upcomingTests.filter(t => t.scheduledDate === todayStr);

  const handleQuickStart = () => {
    const total = parseInt(totalQuestions);
    const start = parseInt(startFrom) || 1;
    const time = parseInt(timeInMinutes);
    if (!total || total < 1 || !time || time < 1) return;
    setConfig({ totalQuestions: total, startFrom: start, timeInMinutes: time });
    startTest();
    navigate('/test');
  };

  const handlePlanTest = () => {
    const total = parseInt(planQuestions);
    const start = parseInt(planStart) || 1;
    const time = parseInt(planTime);
    if (!total || !time || !planDate || !planName.trim()) return;
    addPlannedTest({
      name: planName.trim(),
      totalQuestions: total,
      startFrom: start,
      timeInMinutes: time,
      scheduledDate: format(planDate, 'yyyy-MM-dd'),
    });
    setPlanned(getPlannedTests());
    setPlanName('');
    setPlanQuestions('');
    setPlanStart('1');
    setPlanTime('');
    setPlanDate(undefined);
    setTab('upcoming');
  };

  const handleStartPlanned = (test: PlannedTest) => {
    setConfig({ totalQuestions: test.totalQuestions, startFrom: test.startFrom, timeInMinutes: test.timeInMinutes });
    startTest();
    // Store planned test ID so we can mark it completed after test
    sessionStorage.setItem('planned_test_id', test.id);
    navigate('/test');
  };

  const handleDeletePlanned = (id: string) => {
    if (!confirm('Delete this planned test?')) return;
    deletePlannedTest(id);
    setPlanned(getPlannedTests());
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'quick', label: 'Quick Start', icon: '⚡' },
    { key: 'plan', label: 'Plan Test', icon: '📅' },
    { key: 'upcoming', label: `Upcoming${upcomingTests.length ? ` (${upcomingTests.length})` : ''}`, icon: '📋' },
    { key: 'history', label: `Past Tests${savedTests.length ? ` (${savedTests.length})` : ''}`, icon: '📊' },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">📝 OMR Test</h1>
        <p className="text-muted-foreground mt-1 text-sm">Configure, plan, and track your tests</p>
      </div>

      {/* Today's tests banner */}
      {todayTests.length > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
          <div className="text-sm font-bold text-primary font-mono mb-2">🔔 Today's Tests</div>
          <div className="space-y-2">
            {todayTests.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-2">
                <span className="text-sm font-mono text-foreground truncate">{t.name}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                  <span>{t.totalQuestions}Q · {t.timeInMinutes}m</span>
                  <button
                    onClick={() => handleStartPlanned(t)}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded font-bold text-xs hover:opacity-90 transition-opacity"
                  >
                    ▶ Start
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => t.key === 'history' ? navigate('/omr/history') : setTab(t.key)}
            className={cn(
              'flex-1 py-2 px-2 rounded-md text-xs sm:text-sm font-medium transition-colors',
              tab === t.key && t.key !== 'history'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="hidden sm:inline">{t.icon} </span>{t.label}
          </button>
        ))}
      </div>

      {/* Quick Start */}
      {tab === 'quick' && (
        <div className="space-y-5 bg-card border border-border rounded-lg p-6">
          <div className="text-sm font-bold font-mono text-foreground">⚡ Quick Start</div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Number of Questions</label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 90"
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(e.target.value)}
              className="w-full h-12 px-4 text-lg font-mono border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Starting Question Number</label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 1"
              value={startFrom}
              onChange={(e) => setStartFrom(e.target.value)}
              className="w-full h-12 px-4 text-lg font-mono border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Time (minutes)</label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 180"
              value={timeInMinutes}
              onChange={(e) => setTimeInMinutes(e.target.value)}
              className="w-full h-12 px-4 text-lg font-mono border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            <strong>Scoring:</strong> +4 for correct, −1 for wrong, 0 for unanswered
          </div>
          <button
            onClick={handleQuickStart}
            disabled={!totalQuestions || !timeInMinutes}
            className="w-full h-12 bg-primary text-primary-foreground font-bold text-lg rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            ▶ Start Test
          </button>
        </div>
      )}

      {/* Plan Test */}
      {tab === 'plan' && (
        <div className="space-y-5 bg-card border border-border rounded-lg p-6">
          <div className="text-sm font-bold font-mono text-foreground">📅 Plan a Test</div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Test Name</label>
            <input
              type="text"
              placeholder="e.g. Physics Mock Test 3"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full h-12 px-4 text-lg font-mono border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Questions</label>
              <input
                type="number"
                min={1}
                placeholder="e.g. 90"
                value={planQuestions}
                onChange={(e) => setPlanQuestions(e.target.value)}
                className="w-full h-12 px-4 text-lg font-mono border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start From</label>
              <input
                type="number"
                min={1}
                placeholder="1"
                value={planStart}
                onChange={(e) => setPlanStart(e.target.value)}
                className="w-full h-12 px-4 text-lg font-mono border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Time (minutes)</label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 180"
              value={planTime}
              onChange={(e) => setPlanTime(e.target.value)}
              className="w-full h-12 px-4 text-lg font-mono border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Scheduled Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "w-full h-12 px-4 text-left text-lg font-mono border border-border rounded bg-background flex items-center gap-2",
                  planDate ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  📅 {planDate ? format(planDate, 'dd MMM yyyy') : 'Pick a date'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={planDate}
                  onSelect={setPlanDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <button
            onClick={handlePlanTest}
            disabled={!planName.trim() || !planQuestions || !planTime || !planDate}
            className="w-full h-12 bg-primary text-primary-foreground font-bold text-lg rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            📅 Schedule Test
          </button>
        </div>
      )}

      {/* Upcoming Tests */}
      {tab === 'upcoming' && (
        <div className="space-y-3">
          {upcomingTests.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-lg">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-sm">No planned tests. Use "Plan Test" to schedule one.</p>
            </div>
          ) : (
            upcomingTests.map(test => {
              const isToday = test.scheduledDate === todayStr;
              const isPast = test.scheduledDate < todayStr;
              return (
                <div
                  key={test.id}
                  className={cn(
                    "bg-card border rounded-lg p-4 transition-colors",
                    isToday ? 'border-primary/50 bg-primary/5' : isPast ? 'border-destructive/30 bg-destructive/5' : 'border-border'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono font-bold text-foreground truncate">{test.name}</div>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-xs font-mono text-muted-foreground">
                        <span className={cn(
                          "px-2 py-0.5 rounded",
                          isToday ? 'bg-primary/20 text-primary font-bold' : isPast ? 'bg-destructive/20 text-destructive' : 'bg-muted'
                        )}>
                          {isToday ? '🔴 Today' : isPast ? '⚠ Overdue' : format(new Date(test.scheduledDate), 'dd MMM')}
                        </span>
                        <span>{test.totalQuestions}Q</span>
                        <span>Q{test.startFrom}–{test.startFrom + test.totalQuestions - 1}</span>
                        <span>⏱ {test.timeInMinutes}m</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleStartPlanned(test)}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-bold hover:opacity-90 transition-opacity"
                      >
                        ▶ Start
                      </button>
                      <button
                        onClick={() => handleDeletePlanned(test.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive text-sm"
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default SetupPage;
