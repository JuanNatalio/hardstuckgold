import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import eslintPluginCheckFile from 'eslint-plugin-check-file'

export default tseslint.config(
  { ignores: ['**/node_modules', '**/dist', '**/out', 'src/renderer/dist'] },
  tseslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  {
    plugins: { 'react-hooks': eslintPluginReactHooks },
    rules: eslintPluginReactHooks.configs.recommended.rules
  },
  {
    settings: { react: { version: 'detect' } },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off'
    }
  },
  {
    // React components: PascalCase.
    files: ['src/renderer/src/{components,views}/**/*.tsx'],
    plugins: { 'check-file': eslintPluginCheckFile },
    rules: {
      'check-file/filename-naming-convention': ['error', { '**/*.tsx': 'PASCAL_CASE' }]
    }
  },
  {
    // Hooks: camelCase.
    files: ['src/renderer/src/hooks/**/*.ts'],
    plugins: { 'check-file': eslintPluginCheckFile },
    rules: {
      'check-file/filename-naming-convention': ['error', { '**/*.ts': 'CAMEL_CASE' }]
    }
  },
  {
    // Everything else (main process, preload, shared, non-component renderer files): kebab-case.
    files: [
      'src/main/**/*.ts',
      'src/preload/**/*.ts',
      'src/shared/**/*.ts',
      'src/renderer/src/**/*.ts'
    ],
    ignores: ['src/**/*.d.ts', 'src/renderer/src/hooks/**'],
    plugins: { 'check-file': eslintPluginCheckFile },
    rules: {
      'check-file/filename-naming-convention': ['error', { '**/*.ts': 'KEBAB_CASE' }]
    }
  },
  eslintConfigPrettier
)
