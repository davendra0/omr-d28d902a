import { create } from 'zustand';
import type { TestConfig, QuestionResponse, TestResult, AnswerKey, Option } from '@/types/test';

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
  toggleReview: (questionNo: number) => void;
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
    const responses: QuestionResponse[] = [];
    for (let i = 0; i < config.totalQuestions; i++) {
      responses.push({
        questionNo: config.startFrom + i,
        selected: null,
        markedForReview: false,
        answeredAt: null,
      });
    }
    set({ config, responses });
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
