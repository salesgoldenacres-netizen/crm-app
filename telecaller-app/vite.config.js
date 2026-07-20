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
        // Split Firebase SDK from app feature chunks (Wave 6 Phase 2E).
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Cloud Functions use their own node:test runner (see functions/package.json).
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/functions/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/.tmp/**',
      '**/.archive/**',
    ],
    coverage: {
      provider: 'v8',
      include: [
        'src/shared/utils/**/*.ts',
        'src/shared/services/**/*.ts',
        'src/features/**/*.ts',
        'src/features/**/*.tsx',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.d.ts',
        'src/test/**/*',
        'src/shared/services/firebase/converters.ts',
        'src/shared/services/firebase/repositories.ts',
      ],
      thresholds: {
        lines: 1,
        functions: 1,
        statements: 1,
      },
    },
  },
})
