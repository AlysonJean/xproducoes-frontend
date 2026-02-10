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
  },
})