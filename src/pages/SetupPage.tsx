import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '@/store/testStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClipboardList, Clock, Hash, Play } from 'lucide-react';

const SetupPage = () => {
  const [totalQuestions, setTotalQuestions] = useState('');
  const [startFrom, setStartFrom] = useState('1');
  const [timeInMinutes, setTimeInMinutes] = useState('');
  const { setConfig, startTest } = useTestStore();
  const navigate = useNavigate();

  const handleStart = () => {
    const total = parseInt(totalQuestions);
    const start = parseInt(startFrom) || 1;
    const time = parseInt(timeInMinutes);
    if (!total || total < 1 || !time || time < 1) return;

    setConfig({ totalQuestions: total, startFrom: start, timeInMinutes: time });
    startTest();
    navigate('/test');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <ClipboardList className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold font-mono tracking-tight">OMR Test Sheet</CardTitle>
          <CardDescription>Configure your test and start answering</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="total" className="flex items-center gap-2 text-sm font-medium">
              <Hash className="w-4 h-4 text-muted-foreground" />
              Number of Questions
            </Label>
            <Input
              id="total"
              type="number"
              min={1}
              placeholder="e.g. 90"
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(e.target.value)}
              className="font-mono text-lg h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start" className="flex items-center gap-2 text-sm font-medium">
              <Hash className="w-4 h-4 text-muted-foreground" />
              Starting Question Number
            </Label>
            <Input
              id="start"
              type="number"
              min={1}
              placeholder="e.g. 45"
              value={startFrom}
              onChange={(e) => setStartFrom(e.target.value)}
              className="font-mono text-lg h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time" className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Time (minutes)
            </Label>
            <Input
              id="time"
              type="number"
              min={1}
              placeholder="e.g. 180"
              value={timeInMinutes}
              onChange={(e) => setTimeInMinutes(e.target.value)}
              className="font-mono text-lg h-12"
            />
          </div>

          <Button
            onClick={handleStart}
            disabled={!totalQuestions || !timeInMinutes}
            className="w-full h-12 text-base font-semibold gap-2"
          >
            <Play className="w-5 h-5" />
            Start Test
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupPage;
