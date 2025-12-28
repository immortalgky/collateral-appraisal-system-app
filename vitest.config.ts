/// <reference types="vitest/config" />
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig({ mode: 'test' }),
  defineConfig({
    // Override environment variables for tests
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:3000/api'),
    },
    test: {
      // Use happy-dom for faster tests (lighter than jsdom)
      environment: 'happy-dom',

      // Enable global test functions (describe, it, expect)
      globals: true,

      // Setup file runs before each test file
      setupFiles: ['./src/test/setup.ts'],

      // Test file patterns
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['node_modules', 'dist', 'e2e'],

      // Coverage configuration
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'json'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.{test,spec}.{ts,tsx}',
          'src/test/**/*',
          'src/main.tsx',
          'src/**/*.d.ts',
          'src/**/types.ts',
          'src/**/types/**/*',
        ],
      },

      // Clear mocks between tests
      clearMocks: true,
      restoreMocks: true,
    },
  })
);
