/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve, dirname } from 'path'
import alias from '@rollup/plugin-alias'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    alias({
      entries: [
        { find: '@', replacement: resolve(__dirname, 'src') },
        { find: '@/services', replacement: resolve(__dirname, 'src/services') },
        { find: '@/utils', replacement: resolve(__dirname, 'src/utils') },
        { find: '@/components', replacement: resolve(__dirname, 'src/components') },
        { find: '@/pages', replacement: resolve(__dirname, 'src/pages') }
      ]
    }),
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/__tests__/**', 'src/**/*.d.ts', 'src/**/*.test.{ts,tsx}'],
      // Achado (auditoria): cobertura nunca tinha sido medida aqui (nem o provider estava
      // instalado). Piso definido um pouco abaixo do medido em 2026-07-13 com este provider
      // recém-adicionado (statements 5.61%, branches 4.83%, functions 3.92%, lines 5.7%) — os
      // testes unitários deste repo cobrem pouco porque grande parte da cobertura real vem dos
      // specs do Playwright em e2e/ (não medidos por este provider). Não é meta aspiracional,
      // é piso contra regressão silenciosa.
      thresholds: {
        statements: 5,
        branches: 4,
        functions: 3,
        lines: 5,
      },
    },
  },
})