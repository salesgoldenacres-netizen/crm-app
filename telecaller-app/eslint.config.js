import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'functions', 'android', 'seed-plots.js', 'scripts', '.tmp', '.archive', '**/.archive/**']),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'react-refresh/only-export-components': 'off',
      // Wave 10 Agent 4 — ban native browser dialogs in app UI
      'no-alert': 'error',
      'no-restricted-globals': [
        'error',
        {
          name: 'alert',
          message: 'Use Toast or InteractionDialog instead of window.alert.',
        },
        {
          name: 'confirm',
          message: 'Use InteractionDialog (confirm mode) instead of window.confirm.',
        },
        {
          name: 'prompt',
          message: 'Use InteractionDialog (prompt mode) instead of window.prompt.',
        },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'firebase/firestore',
              message:
                'Prefer repositories / shared listeners under @/shared/services/firebase instead of direct firestore imports in features.',
            },
          ],
        },
      ],
    },
  },
  // Phase B — lead list/query paths must not import Firestore directly (LeadQueryService / repos).
  {
    files: ['src/features/leads/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'firebase/firestore',
              message:
                'Lead list/query reads go through LeadQueryService; mutations through LeadsRepository. Do not import firebase/firestore in features/leads.',
            },
          ],
        },
      ],
    },
  },
  // Phase C — call-log / productivity domains use CallLogsRepository (critical path).
  {
    files: [
      'src/features/calls/**/*.{ts,tsx}',
      'src/features/admin/hooks/useAgentProductivityStore.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'firebase/firestore',
              message:
                'Call-log writes go through CallLogsRepository; prefer shared firebase services over direct firestore imports in call/productivity paths.',
            },
          ],
        },
      ],
    },
  },
])
