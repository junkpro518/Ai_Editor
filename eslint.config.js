// @ts-check
import tseslint from 'typescript-eslint';

// حدود الطبقات (plan.md §Structure Decision، T003):
// src/core نقي: لا Electron، لا React، لا Node (fs/path/child_process)، لا main، لا renderer.
// استثناء وحيد: أنواع OffscreenCanvas من lib.dom في compose.ts (أنواع فقط، لا DOM حي).
const coreForbidden = [
  { group: ['electron', 'electron/*'], message: 'src/core لا يستورد Electron (الدستور، plan.md).' },
  { group: ['react', 'react-dom', 'react/*', 'react-dom/*'], message: 'src/core لا يستورد React.' },
  {
    group: ['node:*', 'fs', 'fs/*', 'path', 'os', 'child_process', 'crypto', 'stream', 'util', 'events', 'url'],
    message: 'src/core بلا Node API؛ الملفات والعمليات في src/main.',
  },
  { group: ['**/main/**', '**/renderer/**', '**/preload/**'], message: 'src/core لا يعرف main/renderer/preload.' },
];

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'out/**', 'dist/**', 'release/**', 'coverage/**', 'resources/**', 'tests/fixtures/**', '**/*.min.js', 'src/core/contracts/types.ts', 'src/core/contracts/validators.generated.*', '.claude/**', '.specify/**', 'خام/**', 'specs/**', '1/**', '2/**', '3/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: coreForbidden }],
      'no-restricted-globals': [
        'error',
        { name: 'document', message: 'src/core بلا DOM؛ القياس يُحقن من renderer (plan.md §Assumptions).' },
        { name: 'window', message: 'src/core بلا DOM.' },
        { name: 'process', message: 'src/core بلا Node.' },
      ],
    },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['electron', 'electron/*'], message: 'الواجهة تتكلم مع main عبر preload فقط (contextIsolation).' },
            { group: ['node:*', 'fs', 'fs/*', 'path', 'child_process'], message: 'لا Node API في renderer.' },
            { group: ['**/main/**'], message: 'renderer لا يستورد main.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom'], message: 'لا واجهة في main/preload.' },
            { group: ['**/renderer/**'], message: 'main لا يستورد renderer.' },
          ],
        },
      ],
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
);
