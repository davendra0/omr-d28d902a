export type Option = 'A' | 'B' | 'C' | 'D' | null;

export type MarkType = 'review' | 'later' | 'doubt' | 'check';

export const MARK_ICONS: Record<MarkType, { icon: string; label: string; color: string }> = {
  review: { icon: '⚑', label: 'Review', color: 'text-[hsl(var(--review))]' },
  later: { icon: '⏳', label: 'Attempt Later', color: 'text-[hsl(var(--accent))]' },
  doubt: { icon: '❓', label: 'Doubt', color: 'text-destructive' },
  check: { icon: '👁', label: 'Check if time', color: 'text-primary' },
};

export type SectionType = 'mcq' | 'numerical';

export interface TestSection {
  name: string;
  startQ: number;
  endQ: number;
  type?: SectionType; // defaults to 'mcq'
}

export interface DisplayPrefs {
  showCountdown: boolean;
  showWallClock: boolean;
  showQuestionsLeft: boolean;
  showAnswered: boolean;
  showMarked: boolean;
  showQuestionRange: boolean;
}

export const DEFAULT_DISPLAY_PREFS: DisplayPrefs = {
  showCountdown: true,
  showWallClock: false,
  showQuestionsLeft: true,
  showAnswered: true,
  showMarked: true,
  showQuestionRange: true,
};

export interface QuestionResponse {
  questionNo: number;
  selected: Option;
  numericalAnswer?: string; // for numerical sections
  markedForReview: boolean;
  marks: MarkType[];
  answeredAt: number | null;
}

export interface TestConfig {
  totalQuestions: number;
  startFrom: number;
  timeInMinutes: number;
  sections: TestSection[];
  displayPrefs: DisplayPrefs;
  wallClockStartTime?: string;
}

export interface TestResult {
  config: TestConfig;
  responses: QuestionResponse[];
  startTime: number;
  endTime: number;
}

// Answer key: Option (single MCQ), 'BONUS', Option[] (multiple correct), string (numerical)
export type AnswerKeyValue = Option | 'BONUS' | Option[] | string;

export interface AnswerKey {
  [questionNo: number]: AnswerKeyValue;
}

export interface AnalysisItem {
  questionNo: number;
  selected: Option;
  correct: Option;
  isCorrect: boolean;
  timeTaken: number | null;
}
