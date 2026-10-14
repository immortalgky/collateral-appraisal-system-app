import { describe, expect, it } from 'vitest';
import type { ActivityAction } from '@/features/appraisal/api/workflow';
import {
  COMMITTEE_ACTIVITY_ID,
  currentStepOf,
  endsWorkflow,
  resolveLiftoff,
  sameUser,
  stepHasTitle,
} from './decisionHelpers';

describe('currentStepOf', () => {
  it('is the LAST in-progress row, and undefined when none is', () => {
    const rows = [
      { id: 1, status: 'completed' },
      { id: 2, status: 'in_progress' },
      { id: 3, status: 'completed' },
      { id: 4, status: 'in_progress' },
    ];
    expect(currentStepOf(rows)?.id).toBe(4);
    expect(currentStepOf(rows.slice(0, 1))).toBeUndefined();
    expect(currentStepOf([])).toBeUndefined();
  });
});

const action = (value: string, movement?: string): ActivityAction => ({
  value,
  label: value,
  movement,
  assignmentMode: 'system',
  targetActivityId: null,
});

interface Over {
  isCompleted?: boolean;
  activityId?: string;
  nextActivityId?: string | null;
}

const run = (
  a: ActivityAction | null,
  { isCompleted = false, activityId, nextActivityId = null }: Over = {},
) => resolveLiftoff({ action: a, isCompleted, activityId, nextActivityId });

const vote = { activityId: COMMITTEE_ACTIVITY_ID };

describe('resolveLiftoff scene', () => {
  it('is final once the workflow has completed', () => {
    expect(run(action('submit', 'F'), { isCompleted: true }).scene).toBe('final');
  });

  it('forwards a plain forward action, and when no action is known', () => {
    expect(run(action('submit', 'F')).scene).toBe('forward');
    expect(run(action('submit')).scene).toBe('forward');
    expect(run(null).scene).toBe('forward');
  });

  it('routes back on movement B and cancels on movement C', () => {
    expect(run(action('send_to_maker', 'B')).scene).toBe('routeBack');
    expect(run(action('void', 'C')).scene).toBe('cancel');
  });

  it('keeps cancel / route back when they also end the workflow', () => {
    expect(run(action('void', 'C'), { isCompleted: true }).scene).toBe('cancel');
    expect(run(action('send_to_maker', 'B'), { isCompleted: true }).scene).toBe('routeBack');
  });

  it('ignores label keywords outside the committee', () => {
    expect(run(action('approve', 'F')).scene).toBe('forward');
    expect(run(action('reject')).scene).toBe('forward');
  });

  it('stamps committee votes by value', () => {
    expect(run(action('approve'), vote).scene).toBe('approve');
    expect(run(action('REJECT'), vote).scene).toBe('reject');
    expect(run(action('route_back'), vote).scene).toBe('routeBack');
    expect(run(action('abstain'), vote).scene).toBe('forward');
  });
});

describe('resolveLiftoff voteOutcome', () => {
  it('is null outside the committee', () => {
    const res = run(action('submit', 'F'), { nextActivityId: 'x', isCompleted: true });
    expect(res.voteOutcome).toBeNull();
  });

  it('is pending only while the work is still on the committee step', () => {
    const stay = run(action('approve'), { ...vote, nextActivityId: COMMITTEE_ACTIVITY_ID });
    expect(stay.voteOutcome).toBe('pending');
  });

  it('is moved when the work went to a different step', () => {
    const res = run(action('approve'), { ...vote, nextActivityId: 'int-offline-book-keyin' });
    expect(res.voteOutcome).toBe('moved');
    expect(res.scene).toBe('approve');
  });

  it('is moved, not pending, when the server reports no next step', () => {
    expect(run(action('approve'), vote).voteOutcome).toBe('moved');
  });

  it('keeps reject / route-back votes pending while on the committee step', () => {
    const stay = { ...vote, nextActivityId: COMMITTEE_ACTIVITY_ID };
    const reject = run(action('reject'), stay);
    expect(reject.scene).toBe('reject');
    expect(reject.voteOutcome).toBe('pending');
    const back = run(action('route_back'), stay);
    expect(back.scene).toBe('routeBack');
    expect(back.voteOutcome).toBe('pending');
  });

  it('is moved when a route_back vote sent the work to an earlier step', () => {
    const res = run(action('route_back'), { ...vote, nextActivityId: 'some-earlier-step' });
    expect(res.scene).toBe('routeBack');
    expect(res.voteOutcome).toBe('moved');
  });

  it('is ended only when the vote completed the workflow', () => {
    expect(run(action('approve'), { ...vote, isCompleted: true }).voteOutcome).toBe('ended');
    const both = run(action('approve'), { ...vote, isCompleted: true, nextActivityId: 'x' });
    expect(both.voteOutcome).toBe('ended');
  });
});

describe('endsWorkflow', () => {
  const act = (
    value: string,
    movement: string,
    targetActivityId: string | null,
  ): ActivityAction => ({
    value,
    label: value,
    movement,
    assignmentMode: 'system',
    targetActivityId,
  });

  it('only a missing target ends the workflow, not a target we have no title for', () => {
    expect(endsWorkflow(act('done', 'F', null))).toBe(true);
    expect(endsWorkflow(act('done', 'F', ''))).toBe(true);
    expect(endsWorkflow(act('go', 'F', 'some-unknown-step'))).toBe(false);
    expect(endsWorkflow(act('go', 'F', 'appraisal-assignment'))).toBe(false);
    expect(endsWorkflow(act('cancel', 'C', null))).toBe(false);
  });
});

describe('stepHasTitle', () => {
  // Real history rows: TaskName is a code, TaskDescription is the readable title.
  const row = (taskName: string, taskDescription: string | null) => ({
    stepName: taskName,
    taskDescription,
  });

  const TITLE = 'Appraisal Initiation Check';

  it('matches the description to the activity title, ignoring case and outer spaces', () => {
    expect(stepHasTitle(row('InitiationCheck', TITLE), TITLE)).toBe(true);
    expect(stepHasTitle(row('InitiationCheck', TITLE), TITLE.toLowerCase())).toBe(true);
    expect(stepHasTitle(row('x', `  ${TITLE} `), TITLE)).toBe(true);
  });

  it('does not match a different step, and the code alone is not the title', () => {
    expect(stepHasTitle(row('InitiationCheck', TITLE), 'Appraisal Initiation')).toBe(false);
    const assignment = row('AppraisalAssignment', 'Appraisal Assignment');
    expect(stepHasTitle(assignment, 'AppraisalAssignment')).toBe(false);
  });

  it('falls back to the name without a description, and never matches an unknown title', () => {
    expect(stepHasTitle(row(TITLE, null), TITLE)).toBe(true);
    expect(stepHasTitle(row('x', TITLE), null)).toBe(false);
  });
});

describe('sameUser', () => {
  it('ignores case and treats an empty side as no match', () => {
    expect(sameUser('P5229', 'p5229')).toBe(true);
    expect(sameUser('P5229', 'P5230')).toBe(false);
    expect(sameUser(null, null)).toBe(false);
    expect(sameUser('P5229', undefined)).toBe(false);
  });
});
