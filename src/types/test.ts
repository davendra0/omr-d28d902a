export type Option = 'A' | 'B' | 'C' | 'D' | null;

export interface QuestionResponse {
  questionNo: number;
  selected: Option;
  markedForReview: boolean;
  answeredAt: number | null; // timestamp
}

export interface TestConfig {
  totalQuestions: number;
  startFrom: number;
  timeInMinutes: number;
}

export interface TestResult {
  config: TestConfig;
  responses: QuestionResponse[];
  startTime: number;
  endTime: number;
}

export interface AnswerKey {
  [questionNo: number]: Option;
}

export interface AnalysisItem {
  questionNo: number;
  selected: Option;
  correct: Option;
  isCorrect: boolean;
  timeTaken: number | null; // seconds from previous answer
}
