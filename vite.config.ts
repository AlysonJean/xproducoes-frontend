import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve, dirname } from 'path'
import alias from '@rollup/plugin-alias'
import { fileURLToPath } from 'url'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

// Compat: em ESM não existe __dirname por padrão
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // Rollup alias fallback (adds resilience for some CI environments)
    alias({
      entries: [
        { find: '@', replacement: resolve(__dirname, 'src') },
        { find: '@/services', replacement: resolve(__dirname, 'src/services') },
        { find: '@/utils', replacement: resolve(__dirname, 'src/utils') },
        { find: '@/components', replacement: resolve(__dirname, 'src/components') },
        { find: '@/pages', replacement: resolve(__dirname, 'src/pages') }
        ]
    }),
    // Resolve paths defined in tsconfig.json (ensures aliases like @/services resolve in CI)
    tsconfigPaths(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'xproducoes-logo.svg'],
      manifest: {
        name: 'X-Produções',
        short_name: 'X-Produções',
        description: 'Aluguel de equipamentos audiovisuais',
        theme_color: '#194459',
        background_color: '#ffffff',
        start_url: '/',
        display: 'standalone',
        lang: 'pt-BR',
          icons: [
          {
            src: 'favicon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'favicon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Excluir arquivos de análise de bundle do cache PWA
        globIgnores: ['stats.html'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              }
            }
          }
        ]
      }
    }),
    // Bundle analyzer - gera relatório em dist/stats.html
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    })
  ],
  server: {
    port: 3000,
    open: true
  },
    build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Refina divisão de chunks para dependências pesadas e páginas grandes
        manualChunks(id) {
          if (!id) return null;

          // Node modules -> vendor groups
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('date-fns') || id.includes('chart.js')) return 'charts-vendor';
            if (id.includes('react-big-calendar')) return 'calendar-vendor';
            if (id.includes('xlsx-js-style') || id.includes('xlsx')) return 'xlsx-vendor';
            if (id.includes('@mui/material') || id.includes('react-icons') || id.includes('lucide-react') || id.includes('@heroicons')) return 'ui-vendor';
            if (id.includes('axios')) return 'network-vendor';
            // React e libs principais agora ficam só no vendor
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router-dom')
            ) return 'vendor';
            // Outras libs pesadas podem ser agrupadas aqui
            return 'vendor';
          }

          // Project pages -> dedicated chunks
          if (id.includes('/src/pages/admin/') || id.includes('src\\pages\\admin\\')) return 'admin-chunk';
          if (
            id.includes('/src/pages/client/') ||
            id.includes('/src/pages/collaborator/') ||
            id.includes('/src/pages/freelancer/') ||
            id.includes('src\\pages\\client\\')
          )
            return 'dashboard-chunk';

          // Outras páginas grandes podem ser separadas aqui

          return null;
        }
      }
    },
    // Otimizações de build
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    // Code splitting
    cssCodeSplit: true,
      // Chunk size warnings
      chunkSizeWarningLimit: 2000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/pages': resolve(__dirname, 'src/pages'),
      '@/hooks': resolve(__dirname, 'src/hooks'),
      '@/contexts': resolve(__dirname, 'src/contexts'),
      '@/services': resolve(__dirname, 'src/services'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/styles': resolve(__dirname, 'src/styles'),
      '@/validators': resolve(__dirname, 'src/validators')
    }
  },
  // Otimizações adicionais
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'lucide-react',
      'date-fns',
      'clsx'
    ]
  },
})

