import { createSlice, PayloadAction } from '@reduxjs/toolkit';
// import { Question } from '@/types/questionType';

interface Example {
  input: string;
  output: string;
  explanation: string;
}

interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface FunctionSignatures {
  javascript?: string;
  python?: string;
  java?: string;
  cpp?: string;
}

interface Solution {
  language: string;
  solutionCode: string;
  status: string;
  submittedAt: string; // ISO date string
  time: number | null;
  memory: number | null;
}
interface Problem {
  _id: string;
  title: string;
  difficulty: string;
  topics: string[];
  status: string;
  description: string;
  constraints: string[];
  examples: Example[];
  testCases: TestCase[];
  functionSignatures?: FunctionSignatures;
  solutions?: Solution[];
}

interface ProblemState {
  problems: Problem[];
  problem: Problem | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProblemState = {
  problems: [],
  problem: null,
  loading: false,
  error: null,
};

const problemSlice = createSlice({
  name: "problems",
  initialState,
  reducers: {
    fetchProblemsStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchProblemsSuccess(state, action: PayloadAction<Problem[]>) {
      state.problems = action.payload;
      state.loading = false;
    },
    fetchProblemsFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    fetchProblemByIdStart(state) {
      state.loading = true;
      state.error = null;
      state.problem = null;
    },
    fetchProblemByIdSuccess(state, action: PayloadAction<Problem>) {
      state.problem = action.payload;
      state.loading = false;
    },
    fetchProblemByIdFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    addSolutionToProblem: (state, action: PayloadAction<Solution>) => {
      if (state.problem) {
        state.problem.solutions = [
          action.payload,
          ...(state.problem.solutions || []),
        ];
      }
    },
  },
});

export const {
    fetchProblemsStart,
    fetchProblemsSuccess,
    fetchProblemsFailure,
    fetchProblemByIdStart,
    fetchProblemByIdSuccess,
    fetchProblemByIdFailure,
    addSolutionToProblem,
} = problemSlice.actions;

export default problemSlice.reducer;