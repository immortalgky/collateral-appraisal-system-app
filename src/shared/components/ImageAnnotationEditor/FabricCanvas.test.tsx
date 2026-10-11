import { describe, expect, it, vi } from 'vitest';
import { render } from '@/test/test-utils';
import FabricCanvas from './FabricCanvas';

const fabric = vi.hoisted(() => ({
  canvases: [] as { disposed: boolean; setDimensions: ReturnType<typeof vi.fn> }[],
  finishLoad: null as null | (() => void),
  failLoad: null as null | (() => void),
}));

vi.mock('fabric', () => {
  // A Fabric canvas that throws, as the real one does, once it is disposed
  class Canvas {
    disposed = false;
    setDimensions = vi.fn(() => this.assertAlive());
    renderAll = vi.fn(() => this.assertAlive());
    constructor() {
      const canvas = new Proxy(this, {
        get: (target, key) =>
          key in target
            ? (target as unknown as Record<string | symbol, unknown>)[key]
            : typeof key === 'string'
              ? vi.fn()
              : undefined,
        set: (target, key, value) => {
          (target as unknown as Record<string | symbol, unknown>)[key] = value;
          return true;
        },
      });
      fabric.canvases.push(this);
      return canvas;
    }
    assertAlive() {
      if (this.disposed) throw new TypeError("Cannot destructure property 'el' of 'this.lower'");
    }
    dispose() {
      this.disposed = true;
    }
  }
  class Shape {}
  class FabricImage {
    width = 100;
    height = 50;
    scaleX = 1;
    scaleY = 1;
    static fromURL = vi.fn(
      () =>
        new Promise<FabricImage>((resolve, reject) => {
          fabric.finishLoad = () => resolve(new FabricImage());
          fabric.failLoad = () => reject(new Error('image failed to load'));
        }),
    );
  }
  class PencilBrush {}
  return {
    Canvas,
    FabricImage,
    Rect: Shape,
    Circle: Shape,
    Line: Shape,
    IText: Shape,
    Group: Shape,
    FabricText: Shape,
    PencilBrush,
    FabricObject: Shape,
    Triangle: Shape,
  };
});

const props = () => ({
  imageUrl: 'blob:image',
  activeTool: 'select' as const,
  toolOptions: {} as never,
  numberCounter: 1,
  selectedSticker: null,
  onNumberPlaced: vi.fn(),
  onCanvasReady: vi.fn(),
  onSelectionChange: vi.fn(),
  onImageLoaded: vi.fn(),
  onLoadError: vi.fn(),
});

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('FabricCanvas image load', () => {
  it('sizes the canvas and reports the image once it has loaded', async () => {
    const p = props();
    fabric.canvases.length = 0;
    render(<FabricCanvas {...p} />);
    await nextFrame();
    fabric.finishLoad?.();
    await tick();
    expect(fabric.canvases[0].setDimensions).toHaveBeenCalled();
    expect(p.onImageLoaded).toHaveBeenCalledTimes(1);
  });

  it('leaves a canvas alone that was disposed while the image was still loading', async () => {
    const p = props();
    fabric.canvases.length = 0;
    const { unmount } = render(<FabricCanvas {...p} />);
    await nextFrame(); // the load has started
    unmount(); // the editor closed: the canvas is disposed
    expect(fabric.canvases[0].disposed).toBe(true);
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    fabric.finishLoad?.(); // the image arrives afterwards
    await tick();
    process.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
    expect(fabric.canvases[0].setDimensions).not.toHaveBeenCalled();
    expect(p.onImageLoaded).not.toHaveBeenCalled();
  });

  it('does not start loading at all when closed before the first frame', async () => {
    const p = props();
    fabric.canvases.length = 0;
    fabric.finishLoad = null;
    const { unmount } = render(<FabricCanvas {...p} />);
    unmount();
    await nextFrame();
    expect(fabric.finishLoad).toBeNull();
    expect(p.onImageLoaded).not.toHaveBeenCalled();
  });

  it('reports an image that cannot be loaded, once, and does not size or snapshot anything', async () => {
    const p = props();
    fabric.canvases.length = 0;
    render(<FabricCanvas {...p} />);
    await nextFrame();
    fabric.failLoad?.();
    await tick();
    expect(p.onLoadError).toHaveBeenCalledTimes(1);
    expect(fabric.canvases[0].setDimensions).not.toHaveBeenCalled();
    expect(p.onImageLoaded).not.toHaveBeenCalled();
  });

  it('does not call a failure after a successful load a bad image', async () => {
    const p = props();
    p.onImageLoaded.mockImplementation(() => {
      throw new Error('snapshot bug');
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    fabric.canvases.length = 0;
    render(<FabricCanvas {...p} />);
    await nextFrame();
    fabric.finishLoad?.();
    await tick();
    expect(p.onLoadError).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it('says nothing about a failed load once the canvas is already gone', async () => {
    const p = props();
    fabric.canvases.length = 0;
    const { unmount } = render(<FabricCanvas {...p} />);
    await nextFrame();
    unmount();
    fabric.failLoad?.();
    await tick();
    expect(p.onLoadError).not.toHaveBeenCalled();
  });
});
