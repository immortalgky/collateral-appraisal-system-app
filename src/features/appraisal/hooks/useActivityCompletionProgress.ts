/**
 * Subscribes to ActivityStepProgress SignalR events and:
 * 1. Drives the activityProgressStore (for the checklist UI).
 * 2. Keeps updating the global loading overlay message (overlay fallback).
 *
 * PipelineStarted → reset + start store; set overlay to first step label.
 * StepStarted     → stepStarted in store; update overlay message.
 * StepFinished    → stepFinished in store.
 * PipelineFinished → finished in store.
 *
 * The store is reset at PipelineStarted (NOT on settle) so failed state
 * remains visible in the dialog while the user reads errors.
 */

import { useEffect, useRef } from 'react';
import { setLoadingMessage } from '@shared/store';
import {
  onActivityStepProgress,
  type ActivityStepProgressEvent,
} from '../services/activityProgressHub';
import { useActivityProgressStore } from '../store/activityProgressStore';

interface UseActivityCompletionProgressOptions {
  /**
   * True while a `useCompleteActivity` mutation is pending.
   * Events are processed regardless (the store stays after settle so errors
   * remain visible), but the overlay message is only updated while active.
   */
  active: boolean;
}

export function useActivityCompletionProgress({
  active,
}: UseActivityCompletionProgressOptions): void {
  const activeRef = useRef(active);
  activeRef.current = active;

  // Stable store action refs — Zustand actions are stable, but using getState()
  // inside the effect avoids a stale-closure on the actions.
  const storeRef = useRef(useActivityProgressStore.getState);

  useEffect(() => {
    const unsub = onActivityStepProgress((event: ActivityStepProgressEvent) => {
      const store = storeRef.current();

      if (event.phase === 'PipelineStarted') {
        // Reset previous state and seed all steps as pending
        store.reset();
        store.start(event.steps);

        if (activeRef.current) {
          const first = event.steps[0];
          const label = first?.displayName ?? 'Validating...';
          setLoadingMessage(`Checking: ${label}...`);
        }
        return;
      }

      if (event.phase === 'StepStarted') {
        store.stepStarted(event.step.stepName);

        if (activeRef.current) {
          const label = event.step.displayName ?? event.step.stepName;
          setLoadingMessage(`Checking: ${label}...`);
        }
        return;
      }

      if (event.phase === 'StepFinished') {
        store.stepFinished(event.step.stepName, event.outcome);
        return;
      }

      if (event.phase === 'PipelineFinished') {
        store.finished(event.result);
        return;
      }
    });

    return unsub;
  }, []); // stable — subscription is set up once; storeRef/activeRef hold latest values
}
