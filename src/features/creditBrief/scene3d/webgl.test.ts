import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

const gl = (renderer: string) => ({
  getExtension: (name: string) =>
    name === 'WEBGL_debug_renderer_info'
      ? { UNMASKED_RENDERER_WEBGL: 1 }
      : { loseContext: () => {} },
  getParameter: () => renderer,
});

describe('detectGpu', () => {
  it('does not keep a failed probe: a context that is missing now may exist on the next mount', async () => {
    const probe = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    probe.mockReturnValueOnce(null);
    const { detectGpu } = await import('./webgl');
    expect(detectGpu()).toEqual({ available: false, software: false });
    probe.mockReturnValueOnce(gl('NVIDIA GeForce') as unknown as WebGL2RenderingContext);
    expect(detectGpu()).toEqual({ available: true, software: false });
  });

  it('keeps a working context, software included, without probing again', async () => {
    const probe = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(gl('Google SwiftShader') as unknown as WebGL2RenderingContext);
    const { detectGpu } = await import('./webgl');
    expect(detectGpu()).toEqual({ available: true, software: true });
    detectGpu();
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('reads the plain renderer name when the debug extension is missing', async () => {
    const RENDERER = 7937;
    const noDebug = {
      RENDERER,
      getExtension: (name: string) =>
        name === 'WEBGL_debug_renderer_info' ? null : { loseContext: () => {} },
      getParameter: (p: number) => (p === RENDERER ? 'Google SwiftShader' : ''),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      noDebug as unknown as WebGL2RenderingContext,
    );
    const { detectGpu } = await import('./webgl');
    expect(detectGpu()).toEqual({ available: true, software: true });
  });
});
