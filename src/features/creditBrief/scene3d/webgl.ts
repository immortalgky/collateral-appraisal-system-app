/**
 * What this browser can do, probed once WITHOUT importing three.js, so the lazy switch can decide
 * between the 3D and the CSS scene before the three.js chunk is fetched.
 *
 * three.js needs WebGL2. The probe context is released right away: Chrome allows about 16 live
 * contexts per tab, and a leaked one is one fewer for the scene.
 */
export interface GpuInfo {
  available: boolean;
  /** SwiftShader / llvmpipe / "Basic Render": WebGL on the CPU, where shadows and antialiasing crawl. */
  software: boolean;
}

/** Only a verdict that stands is kept: a working context. A failed probe may succeed later (a context freed, a driver back), so it is not pinned. */
let cached: GpuInfo | null = null;

export function detectGpu(): GpuInfo {
  if (cached) return cached;
  let info: GpuInfo = { available: false, software: false };
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (gl) {
      // Some browsers hide the unmasked name: the plain renderer string still says SwiftShader.
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const name = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
      info = {
        available: true,
        software: /swiftshader|llvmpipe|software|basic render/i.test(name),
      };
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    // No WebGL: the CSS scene stands in.
  }
  if (info.available) cached = info;
  return info;
}
