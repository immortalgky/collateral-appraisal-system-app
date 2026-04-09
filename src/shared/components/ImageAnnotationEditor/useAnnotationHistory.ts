import { useCallback, useRef, useState } from 'react';
import type { Canvas as FabricCanvas } from 'fabric';
import { MAX_HISTORY_SIZE } from './constants';

export function useAnnotationHistory(canvasRef: React.RefObject<FabricCanvas | null>) {
  const historyRef = useRef<string[]>([]);
  const currentIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);
  const pausedRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateState = useCallback(() => {
    setCanUndo(currentIndexRef.current > 0);
    setCanRedo(currentIndexRef.current < historyRef.current.length - 1);
  }, []);

  const pauseSnapshots = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const resumeSnapshots = useCallback(() => {
    pausedRef.current = false;
  }, []);

  const saveSnapshot = useCallback(() => {
    if (isRestoringRef.current || pausedRef.current || !canvasRef.current) return;

    const json = JSON.stringify(canvasRef.current.toJSON());

    // Remove any redo states
    historyRef.current = historyRef.current.slice(0, currentIndexRef.current + 1);

    historyRef.current.push(json);

    // Trim if exceeds max
    if (historyRef.current.length > MAX_HISTORY_SIZE) {
      historyRef.current = historyRef.current.slice(-MAX_HISTORY_SIZE);
    }

    currentIndexRef.current = historyRef.current.length - 1;
    updateState();
  }, [canvasRef, updateState]);

  const restoreSnapshot = useCallback(
    async (index: number) => {
      const canvas = canvasRef.current;
      if (!canvas || index < 0 || index >= historyRef.current.length) return;

      isRestoringRef.current = true;
      const json = historyRef.current[index];

      await canvas.loadFromJSON(json);
      canvas.renderAll();

      currentIndexRef.current = index;
      isRestoringRef.current = false;
      updateState();
    },
    [canvasRef, updateState],
  );

  const undo = useCallback(() => {
    if (currentIndexRef.current > 0) {
      void restoreSnapshot(currentIndexRef.current - 1);
    }
  }, [restoreSnapshot]);

  const redo = useCallback(() => {
    if (currentIndexRef.current < historyRef.current.length - 1) {
      void restoreSnapshot(currentIndexRef.current + 1);
    }
  }, [restoreSnapshot]);

  const reset = useCallback(() => {
    historyRef.current = [];
    currentIndexRef.current = -1;
    updateState();
  }, [updateState]);

  return {
    saveSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    isRestoringRef,
    pauseSnapshots,
    resumeSnapshots,
  };
}
