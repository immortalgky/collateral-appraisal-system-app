import { useCallback, useEffect, useRef } from 'react';
import { MAX_AUTOFIT_WIDTH, MAX_DRAG_WIDTH, MIN_COLUMN_WIDTH } from './constants';

interface ColumnResizeHandleProps {
  width: number;
  minWidth?: number;
  maxWidth?: number;
  onResize: (px: number) => void;
  getAutoFitWidth: () => number | null;
}

export function ColumnResizeHandle({
  width,
  minWidth = MIN_COLUMN_WIDTH,
  maxWidth = MAX_AUTOFIT_WIDTH,
  onResize,
  getAutoFitWidth,
}: ColumnResizeHandleProps) {
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  // True while a drag is in progress. Drives userSelect restoration on unmount.
  const draggingRef = useRef(false);

  // Always clear the body selection lock if we unmount mid-drag (the table is
  // unmounted by tab / activity / view switches while the pointer is held down).
  useEffect(() => {
    return () => {
      if (draggingRef.current) document.body.style.userSelect = '';
    };
  }, []);

  const clampTo = useCallback(
    (px: number, max: number) => Math.max(minWidth, Math.min(max, Math.round(px))),
    [minWidth],
  );

  // Pointer events are captured on the element itself, so they keep firing
  // outside the handle and auto-detach if the element unmounts — no window
  // listeners to leak.
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      e.stopPropagation();
      e.preventDefault();

      startXRef.current = e.clientX;
      startWidthRef.current = width;
      draggingRef.current = true;
      document.body.style.userSelect = 'none';
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [width],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      if (!draggingRef.current) return;
      onResize(clampTo(startWidthRef.current + (e.clientX - startXRef.current), MAX_DRAG_WIDTH));
    },
    [onResize, clampTo],
  );

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    document.body.style.userSelect = '';
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      e.stopPropagation();
      const autoFit = getAutoFitWidth();
      if (autoFit !== null) {
        onResize(clampTo(autoFit, maxWidth));
      }
    },
    [getAutoFitWidth, onResize, clampTo, maxWidth],
  );

  return (
    <span
      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none z-10 border-r border-gray-100 hover:border-r-2 hover:border-primary hover:bg-primary/10"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onDoubleClick={handleDoubleClick}
      onClick={e => e.stopPropagation()}
    />
  );
}
