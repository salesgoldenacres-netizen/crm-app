import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// --- Architecture enforcement helpers (audit finding A-1) ----------------------
// Feature domains under src/features/*. Cross-feature imports of another feature's
// pure-logic modules (utils/config/constants/intelligence/copilot) are banned:
// such shared logic must live in @/shared/**. Cross-feature hook/component
// composition is tolerated transitionally and tracked as burn-down debt
// (see architecture_guide.md → "Cross-feature coupling debt").
const FEATURES = [
  'admin',
  'attendance',
  'auth',
  'calls',
  'dashboard',
  'employees',
  'leads',
  'messaging',
  'plots',
  'settings',
]

const CROSS_FEATURE_LOGIC_DIRS = ['utils', 'config', 'constants', 'intelligence', 'copilot']

const CROSS_FEATURE_MESSAGE =
  'Cross-feature logic import is banned (audit A-1). Move shared logic/util/config/constants to @/shared/** and import it from there.'

const FIRESTORE_MESSAGES = {
  default:
    'Prefer repositories / shared listeners under @/shared/services/firebase instead of direct firestore imports in features.',
  leads:
    'Lead list/query reads go through LeadQueryService; mutations through LeadsRepository. Do not import firebase/firestore in features/leads.',
  calls:
    'Call-log writes go through CallLogsRepository; prefer shared firebase services over direct firestore imports in call/productivity paths.',
}

function crossFeatureLogicGroup(self) {
  return FEATURES.filter((feature) => feature !== self).flatMap((feature) =>
    CROSS_FEATURE_LOGIC_DIRS.flatMap((dir) => [
      `@/features/${feature}/${dir}`,
      `@/features/${feature}/${dir}/*`,
      `@/features/${feature}/${dir}/**`,
    ]),
  )
}

function noRestrictedImportsForFeature(self, firestoreMessage) {
  return [
    'error',
    {
      paths: [{ name: 'firebase/firestore', message: firestoreMessage }],
      patterns: [{ group: crossFeatureLogicGroup(self), message: CROSS_FEATURE_MESSAGE }],
    },
  ]
}

function featureRuleBlock(self) {
  return {
    files: [`src/features/${self}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': noRestrictedImportsForFeature(
        self,
        FIRESTORE_MESSAGES[self] || FIRESTORE_MESSAGES.default,
      ),
    },
  }
}

const SHARED_FEATURES_BAN_MESSAGE =
  'Shared layer must not import from @/features/** (audit A-1). Move types/contracts to @/shared/** or inject dependencies at the composition root (App.tsx).';

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
      // Audit C-3 — route logging through @/shared/utils/logger. console.warn /
      // console.error are allowed (surface in prod / crash tools); the noisier
      // levels (log/info/debug/…) are banned outside the logger itself.
      'no-console': ['error', { allow: ['warn', 'error'] }],
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
  // The logger is the single sanctioned console sink (audit C-3).
  {
    files: ['src/shared/utils/logger.ts'],
    rules: { 'no-console': 'off' },
  },
  // Audit C-1 — shared UI primitives must be fully typed (no `any`).
  {
    files: ['src/shared/components/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  // Baseline firestore guard for any feature file (specific blocks below refine it).
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'firebase/firestore', message: FIRESTORE_MESSAGES.default },
          ],
        },
      ],
    },
  },
  // Per-feature firestore guard + cross-feature logic import ban (audit A-1).
  ...FEATURES.map(featureRuleBlock),
  // Audit A-1 — shared/** must never import feature modules (inverted dependency).
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features', '@/features/*', '@/features/**'],
              message: SHARED_FEATURES_BAN_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  // Call-log / productivity critical path keeps the CallLogsRepository message.
  {
    files: ['src/features/admin/hooks/useAgentProductivityStore.ts'],
    rules: {
      'no-restricted-imports': noRestrictedImportsForFeature('admin', FIRESTORE_MESSAGES.calls),
    },
  },
])
