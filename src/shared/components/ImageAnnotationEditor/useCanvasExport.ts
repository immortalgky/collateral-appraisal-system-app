import { useCallback } from 'react';
import type { Canvas as FabricCanvas } from 'fabric';

export function useCanvasExport(canvasRef: React.RefObject<FabricCanvas | null>) {
  const exportCanvas = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    // Deselect all objects before export
    canvas.discardActiveObject();
    canvas.renderAll();

    // Get the background image to calculate original resolution
    const bgImage = canvas.backgroundImage;
    let multiplier = 1;

    if (bgImage) {
      const origWidth = bgImage.width ?? canvas.width;
      const displayWidth = canvas.width;
      if (displayWidth && origWidth) {
        multiplier = origWidth / displayWidth;
      }
    }

    // Export at original resolution
    const exportCanvas = canvas.toCanvasElement(multiplier);

    return new Promise<Blob | null>(resolve => {
      exportCanvas.toBlob(blob => resolve(blob), 'image/png', 1);
    });
  }, [canvasRef]);

  const getCanvasJson = useCallback((): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '{}';
    return JSON.stringify(canvas.toJSON());
  }, [canvasRef]);

  return { exportCanvas, getCanvasJson };
}
