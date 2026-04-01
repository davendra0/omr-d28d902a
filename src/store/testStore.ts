import { create } from 'zustand';
import type { TestConfig, QuestionResponse, TestResult, AnswerKey, Option, MarkType } from '@/types/test';
import { DEFAULT_DISPLAY_PREFS } from '@/types/test';

interface TestStore {
  config: TestConfig | null;
  responses: QuestionResponse[];
  startTime: number | null;
  endTime: number | null;
  result: TestResult | null;
  answerKey: AnswerKey | null;

  setConfig: (config: TestConfig) => void;
  startTest: () => void;
  selectOption: (questionNo: number, option: Option) => void;
  setNumericalAnswer: (questionNo: number, answer: string) => void;
  toggleReview: (questionNo: number) => void;
  toggleMark: (questionNo: number, mark: MarkType) => void;
  endTest: () => void;
  setAnswerKey: (key: AnswerKey) => void;
  setResult: (result: TestResult) => void;
  reset: () => void;
}

export const useTestStore = create<TestStore>((set, get) => ({
  config: null,
  responses: [],
  startTime: null,
  endTime: null,
  result: null,
  answerKey: null,

  setConfig: (config) => {
    // Ensure config has sections and displayPrefs (backward compat)
    const fullConfig: TestConfig = {
      ...config,
      sections: config.sections || [],
      displayPrefs: config.displayPrefs || DEFAULT_DISPLAY_PREFS,
    };
    const responses: QuestionResponse[] = [];
    for (let i = 0; i < fullConfig.totalQuestions; i++) {
      responses.push({
        questionNo: fullConfig.startFrom + i,
        selected: null,
        markedForReview: false,
        marks: [],
        answeredAt: null,
      });
    }
    set({ config: fullConfig, responses });
  },

  startTest: () => set({ startTime: Date.now() }),

  selectOption: (questionNo, option) => {
    const { responses } = get();
    set({
      responses: responses.map((r) =>
        r.questionNo === questionNo
          ? { ...r, selected: r.selected === option ? null : option, answeredAt: Date.now() }
          : r
      ),
    });
  },

  setNumericalAnswer: (questionNo, answer) => {
    const { responses } = get();
    set({
      responses: responses.map((r) =>
        r.questionNo === questionNo
          ? { ...r, numericalAnswer: answer, answeredAt: answer ? Date.now() : r.answeredAt }
          : r
      ),
    });
  },

  toggleReview: (questionNo) => {
    const { responses } = get();
    set({
      responses: responses.map((r) =>
        r.questionNo === questionNo
          ? { ...r, markedForReview: !r.markedForReview }
          : r
      ),
    });
  },

  toggleMark: (questionNo, mark) => {
    const { responses } = get();
    set({
      responses: responses.map((r) => {
        if (r.questionNo !== questionNo) return r;
        const has = r.marks.includes(mark);
        const newMarks = has ? r.marks.filter(m => m !== mark) : [...r.marks, mark];
        return { ...r, marks: newMarks, markedForReview: newMarks.includes('review') };
      }),
    });
  },

  endTest: () => {
    const { config, responses, startTime } = get();
    const endTime = Date.now();
    const result: TestResult = {
      config: config!,
      responses,
      startTime: startTime!,
      endTime,
    };
    set({ endTime, result });
  },

  setAnswerKey: (key) => set({ answerKey: key }),

  setResult: (result) => set({
    result,
    config: result.config,
    responses: result.responses,
    startTime: result.startTime,
    endTime: result.endTime,
  }),

  reset: () =>
    set({
      config: null,
      responses: [],
      startTime: null,
      endTime: null,
      result: null,
      answerKey: null,
    }),
}));
