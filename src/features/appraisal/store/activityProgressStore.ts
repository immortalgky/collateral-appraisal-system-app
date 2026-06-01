import { create } from 'zustand';
import type { ActivityStepDto } from '../services/activityProgressHub';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type StepStatus = 'pending' | 'running' | 'passed' | 'skipped' | 'failed';

export interface ProgressStep {
  stepName: string;
  displayName: string;
  sortOrder: number;
  kind: string;
  status: StepStatus;
}

export type OverallStatus = 'idle' | 'running' | 'done' | 'failed';

interface ActivityProgressState {
  steps: ProgressStep[];
  overall: OverallStatus;
}

interface ActivityProgressActions {
  /** Seed all steps as pending and set overall → running */
  start: (steps: ActivityStepDto[]) => void;
  /** Mark the named step as running (earlier steps assumed passed) */
  stepStarted: (stepName: string) => void;
  /** Mark the named step as passed or failed based on outcome string */
  stepFinished: (stepName: string, outcome: string) => void;
  /** Set overall result; mark any still-running steps as passed */
  finished: (result: string) => void;
  /** Reset to idle/empty */
  reset: () => void;
}

const PASSED_OUTCOMES = new Set(['Passed', 'Success', 'passed', 'success']);
const SKIPPED_OUTCOMES = new Set(['Skipped', 'skipped']);

// ──────────────────────────────────────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────────────────────────────────────

export const useActivityProgressStore = create<ActivityProgressState & ActivityProgressActions>(
  set => ({
    steps: [],
    overall: 'idle',

    start: (steps: ActivityStepDto[]) =>
      set({
        overall: 'running',
        steps: [...steps]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(s => ({ ...s, status: 'pending' as StepStatus })),
      }),

    stepStarted: (stepName: string) =>
      set(state => ({
        steps: state.steps.map(s =>
          s.stepName === stepName ? { ...s, status: 'running' as StepStatus } : s,
        ),
      })),

    stepFinished: (stepName: string, outcome: string) =>
      set(state => ({
        steps: state.steps.map(s => {
          if (s.stepName !== stepName) return s;
          const status: StepStatus = PASSED_OUTCOMES.has(outcome)
            ? 'passed'
            : SKIPPED_OUTCOMES.has(outcome)
              ? 'skipped'
              : 'failed';
          return { ...s, status };
        }),
      })),

    finished: (result: string) =>
      set(state => ({
        overall: PASSED_OUTCOMES.has(result) || SKIPPED_OUTCOMES.has(result) ? 'done' : 'failed',
        // Any step still 'running' when pipeline finishes — mark as done
        steps: state.steps.map(s =>
          s.status === 'running' ? { ...s, status: 'passed' as StepStatus } : s,
        ),
      })),

    reset: () => set({ steps: [], overall: 'idle' }),
  }),
);
