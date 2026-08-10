import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/shared': path.resolve(__dirname, './src/shared'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split large vendor SDKs from app feature chunks.
        manualChunks(id) {
          // Firebase SDK (Wave 6 Phase 2E).
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase';
          }
          // React runtime kept in a stable, long-cacheable vendor chunk (P-2).
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-vendor';
          }
          // Sentry is dynamically imported only when a DSN is configured, so it
          // lands in its own chunk that is never fetched on unconfigured builds (P-3).
          if (id.includes('node_modules/@sentry')) {
            return 'sentry';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Cloud Functions use node:test (functions/package.json); Firestore/Storage
    // rules use node:test + emulators (npm run test:rules). Keep both out of Vitest.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/functions/**',
      '**/rules/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/.tmp/**',
      '**/.archive/**',
    ],
    coverage: {
      provider: 'v8',
      // Measure the meaningful business-logic surface (services, utils,
      // contracts, AI logic, hooks) rather than 4 hand-picked files. Pure
      // React pages/components (*.tsx) are deferred to component/E2E coverage
      // (see residual gaps) and intentionally excluded to keep this an honest
      // unit-coverage gate rather than diluting it with untested UI.
      include: [
        'src/shared/utils/**/*.ts',
        'src/shared/services/**/*.ts',
        'src/shared/contracts/**/*.ts',
        'src/shared/ai/**/*.ts',
        'src/features/**/hooks/**/*.ts',
        'src/features/leads/copilot/**/*.ts',
        'src/shared/services/leads/intelligence/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.d.ts',
        'src/test/**/*',
        // Type-only / barrel modules with no executable logic.
        'src/**/types.ts',
        'src/**/types/**',
        // Firestore converters are thin admin<->model mappers exercised via
        // repository integration (emulator), not unit tests.
        'src/shared/services/firebase/converters.ts',
        // NOTE: repositories.ts is intentionally NOT excluded anymore (T-1):
        // it now counts against the honest coverage number even though its
        // Firestore I/O is only meaningfully covered under the emulator.
      ],
      // Honest, ratchet-style baseline anchored a few points below the
      // currently measured numbers for the surface above (statements ~28.8%,
      // lines ~29.8%, functions ~27.2%, branches ~30.7% as of this commit).
      // Raise these as more logic is covered — do not jump to 80% and break CI.
      thresholds: {
        lines: 25,
        functions: 22,
        statements: 25,
        branches: 25,
      },
    },
  },
})
