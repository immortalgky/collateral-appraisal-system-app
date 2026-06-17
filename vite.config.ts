/// <reference types="node" />
import { defineConfig, loadEnv } from 'vite';
import fs from 'fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/

/**
 * Group large, stable third-party libs into their own long-cached chunks so
 * they are not duplicated across per-route chunks and don't bloat the entry.
 * Unlisted deps fall through (return undefined) to Rollup's default splitting,
 * which keeps each route's code in its own lazy chunk.
 */
function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined;
  // `react-is` MUST live with React: recharts pulls a CommonJS react-is into the
  // `charts` chunk otherwise, whose interop wrapper calls back into `react-vendor`
  // before React's exports are initialized -> "Cannot set properties of undefined
  // (setting 'Activity')". Co-locating it removes the cross-chunk eval-order cycle.
  if (/[\\/]node_modules[\\/](react|react-dom|react-is|react-router|react-router-dom|scheduler)[\\/]/.test(id))
    return 'react-vendor';
  if (/[\\/]node_modules[\\/](recharts|d3-|victory-vendor|internmap)/.test(id)) return 'charts';
  if (/[\\/]node_modules[\\/](@xyflow|dagre|@dagrejs|graphlib)/.test(id)) return 'flow';
  if (/[\\/]node_modules[\\/]fabric[\\/]/.test(id)) return 'canvas';
  if (/[\\/]node_modules[\\/]@microsoft[\\/]signalr/.test(id)) return 'signalr';
  // Matches i18next, react-i18next, i18next-browser-languagedetector, and
  // i18next-resources-to-backend (all start with i18next or react-i18next).
  if (/[\\/]node_modules[\\/](react-)?i18next/.test(id)) return 'i18n-vendor';
  if (
    /[\\/]node_modules[\\/](@tanstack[\\/]react-query|react-hook-form|@hookform|zod|axios)/.test(id)
  )
    return 'data-vendor';
  return undefined;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const keyPath = env.VITE_HTTPS_KEY_PATH;
  const certPath = env.VITE_HTTPS_CERT_PATH;

  return {
    server: {
      https:
        keyPath && certPath
          ? {
              key: fs.readFileSync(keyPath),
              cert: fs.readFileSync(certPath),
            }
          : undefined,
      port: 3000,
    },
    plugins: [
      react(),
      tailwindcss(),
      // Only emit the bundle report when explicitly analyzing (pnpm analyze).
      ...(mode === 'analyze'
        ? [
            visualizer({
              filename: 'dist/stats.html',
              gzipSize: true,
              brotliSize: true,
            }),
          ]
        : []),
    ],
    build: {
      rollupOptions: {
        output: { manualChunks },
      },
      chunkSizeWarningLimit: 800,
    },
    resolve: {
      alias: {
        '@': '/src',
        '@app': '/src/app',
        '@features': '/src/features',
        '@shared': '/src/shared',
        '@styles': '/src/styles',
        '@config': '/src/config',
        '@assets': '/src/assets',
      },
    },
  };
});
