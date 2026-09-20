import { useCallback } from 'react';
import type { Canvas as FabricCanvas } from 'fabric';

export type AnnotationExportFormat = 'image/png' | 'image/jpeg';

/** High enough that an annotated photo is indistinguishable from the original at full zoom. */
const JPEG_QUALITY = 0.92;

/** Paints the canvas over white, so transparent pixels do not become black once alpha is dropped. */
const flattenOntoWhite = (source: HTMLCanvasElement): HTMLCanvasElement => {
  const flattened = document.createElement('canvas');
  flattened.width = source.width;
  flattened.height = source.height;

  const context = flattened.getContext('2d');
  if (!context) return source;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, flattened.width, flattened.height);
  context.drawImage(source, 0, 0);

  return flattened;
};

export function useCanvasExport(canvasRef: React.RefObject<FabricCanvas | null>) {
  /**
   * Exports the annotated image at the original's resolution.
   *
   * The format matters more than it looks. A photograph re-encoded as lossless PNG grows three to
   * five times — a 8 MB JPEG comes back at 30 MB after one arrow is drawn on it, and again on
   * every later edit, with nothing on screen to suggest the file is swelling. So a JPEG stays a
   * JPEG; anything else (a screenshot, a diagram) keeps PNG, where re-encoding as JPEG would blur
   * exactly the thin lines and text those images are made of.
   */
  const exportCanvas = useCallback(
    async (format: AnnotationExportFormat = 'image/png'): Promise<Blob | null> => {
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

      // JPEG has no alpha channel: any pixel the photo does not cover would be written as black
      // rather than as nothing. Compositing onto white first keeps those edges looking like paper.
      const source = format === 'image/jpeg' ? flattenOntoWhite(exportCanvas) : exportCanvas;
      const quality = format === 'image/jpeg' ? JPEG_QUALITY : 1;

      return new Promise<Blob | null>(resolve => {
        source.toBlob(blob => resolve(blob), format, quality);
      });
    },
    [canvasRef],
  );

  const getCanvasJson = useCallback((): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '{}';
    return JSON.stringify(canvas.toJSON());
  }, [canvasRef]);

  return { exportCanvas, getCanvasJson };
}
