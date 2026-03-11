import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getWorkspaceName, setWorkspaceName } from '@/lib/workspaceStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ALL_STORAGE_KEYS = [
  'workspace_name',
  'workspace_syllabus',
  'workspace_pomodoro',
  'workspace_notes',
  'workspace_todos',
  'workspace_mistakes',
  'workspace_countdowns',
  'workspace_planned_tests',
  'omr_test_history',
  'omr_test_state',
];

function exportAllData(): string {
  const data: Record<string, any> = {};
  for (const key of ALL_STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    }
  }
  return JSON.stringify({
    _export: 'workspace_backup',
    _version: 1,
    _exportedAt: new Date().toISOString(),
    data,
  }, null, 2);
}

function importAllData(json: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(json);
    if (!parsed._export || parsed._export !== 'workspace_backup' || !parsed.data) {
      return { success: false, message: 'Invalid backup file format.' };
    }
    const entries = Object.entries(parsed.data);
    let count = 0;
    for (const [key, value] of entries) {
      if (typeof key === 'string') {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        count++;
      }
    }
    return { success: true, message: `Imported ${count} data entries. Refresh the page to see changes.` };
  } catch {
    return { success: false, message: 'Could not parse the file. Make sure it is a valid JSON backup.' };
  }
}

const SettingsPage = () => {
  const [name, setName] = useState(getWorkspaceName);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleNameSave = () => {
    setWorkspaceName(name);
  };

  const handleExport = () => {
    const json = exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importAllData(reader.result as string);
      setImportStatus({ type: result.success ? 'success' : 'error', msg: result.message });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAll = () => {
    if (!window.confirm('Are you sure? This will delete ALL your workspace data permanently.')) return;
    for (const key of ALL_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    setImportStatus({ type: 'success', msg: 'All data cleared. Refresh the page.' });
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-16">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono">⚙️ Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your workspace preferences and data.</p>
        </div>

        {/* Workspace Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspace Name</CardTitle>
            <CardDescription>Customize the name shown in the sidebar.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Workspace" />
              <Button onClick={handleNameSave}>Save</Button>
            </div>
          </CardContent>
        </Card>

        {/* Export / Import */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Backup</CardTitle>
            <CardDescription>Export all your data as a JSON file, or import a previous backup to restore everything.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleExport} variant="outline">
                📥 Export All Data
              </Button>
              <Button onClick={() => fileRef.current?.click()} variant="outline">
                📤 Import Data
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </div>
            {importStatus && (
              <div className={`text-sm rounded-lg p-3 border ${importStatus.type === 'success' ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                {importStatus.msg}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              The export includes: syllabus, notes, todos, mistakes, test history, planned tests, countdowns, pomodoro, and settings.
            </p>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions. Export your data first.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleClearAll}>
              🗑️ Clear All Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
