import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve, dirname } from 'path'
import alias from '@rollup/plugin-alias'
import { fileURLToPath } from 'url'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import vike from 'vike/plugin'


// Compat: em ESM não existe __dirname por padrão
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vike(),
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
    react({
      jsxRuntime: 'automatic',
    }),
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
        // Sem 'html' aqui: esta é uma app SSR (Vike) — não existe um index.html estático
        // para pré-cachear, o HTML é gerado pelo servidor a cada requisição.
        globPatterns: ['**/*.{js,css,ico,png,svg}'],
        // Excluir arquivos de análise de bundle do cache PWA
        globIgnores: ['stats.html'],
        // Achado: por padrão o vite-plugin-pwa registra uma NavigationRoute apontando
        // para "index.html" como app-shell (padrão de SPA) via
        // createHandlerBoundToURL("index.html") — mas essa URL nunca existe no precache
        // desta app SSR, causando "Uncaught (in promise) non-precached-url" a cada
        // navegação. navigateFallback: null desativa esse fallback (cada navegação vai
        // direto para o servidor SSR, que é o comportamento correto aqui).
        navigateFallback: null,
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
    // Achado: Vike roda o build via Environment API do Vite (client + ssr na mesma
    // invocação), e as duas passagens escreviam no mesmo dist/stats.html — a passagem
    // ssr sempre sobrescrevia a do client, deixando o relatório sem utilidade para
    // analisar o que o navegador baixa (o objetivo real desta ferramenta). `isSsrBuild`
    // do defineConfig não distingue as duas (ambas passagens vêm da mesma invocação de
    // `vite build`); o mecanismo certo é `applyToEnvironment`, que a Environment API
    // consulta por plugin/por ambiente.
    {
      ...visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
      applyToEnvironment: (environment: { name: string }) => environment.name === 'client',
    }
  ],
  define: {
    // Flag oficial do SDK do Sentry para eliminar em build os caminhos de código de
    // debug/logging interno (não usados em produção) — https://docs.sentry.io/platforms/javascript/guides/react/best-practices/tree-shaking/
    __SENTRY_DEBUG__: false,
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy apenas para rotas específicas de API Social Wall e TV
      '/api/tv/config': {
        target: 'http://localhost:3001', // Porta do backend
        changeOrigin: true,
        secure: false,
        // Não reescreve path, só redireciona
      },
      '/api/admin/social': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // 2026 Strategic code-splitting: vendor + feature chunks for optimal caching
        manualChunks(id) {
          if (!id) return null;

          // ✅ VENDOR CHUNKS (long-term cache - change infrequently)
          if (id.includes('node_modules')) {
            // React core - always separate for framework updates
            if (
              id.includes('react/') ||
              id.includes('react-dom/') ||
              id.includes('react-router-dom') ||
              id.includes('scheduler')
            ) return 'vendor-react';

            // UI Library components
            if (
              id.includes('@heroicons/react') ||
              id.includes('@headlessui/react') ||
              id.includes('lucide-react')
            ) return 'vendor-ui';

            // Data & state management
            if (
              id.includes('axios') ||
              id.includes('zustand') ||
              id.includes('@tanstack/react-query')
            ) return 'vendor-data';

            // Charting & visualization
            if (
              id.includes('recharts') ||
              id.includes('chart.js') ||
              id.includes('date-fns')
            ) return 'vendor-charts';

            // Animation library
            if (id.includes('framer-motion')) return 'vendor-animation';

            // Let Rollup decide for uncategorized dependencies to avoid circular manual chunks.
            return null;
          }

          // ✅ FEATURE CHUNKS (lazy-loaded on demand - change frequently)
          // Admin dashboard and related pages
          if (
            id.includes('/src/pages/admin/') ||
            id.includes('src\\pages\\admin\\')
          ) return 'feature-admin';

          // Collaborator workspace
          if (
            id.includes('/src/pages/collaborator/') ||
            id.includes('src\\pages\\collaborator\\')
          ) return 'feature-collaborator';

          // Booking pages and components
          if (
            id.includes('/src/pages/booking/') ||
            id.includes('src\\pages\\booking\\')
          ) return 'feature-booking';

          // Shop and equipment pages
          if (
            id.includes('/src/pages/shop/') ||
            id.includes('src\\pages\\shop\\')
          ) return 'feature-shop';

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
    // Chunk size warnings - increased for large feature chunks
    chunkSizeWarningLimit: 1000
  },
  ssr: {
    noExternal: [
      'react-helmet-async',
      '@mui/material',
      '@mui/system',
      '@mui/base',
      '@mui/utils',
      '@lottiefiles/dotlottie-react',
      // Bundle date-fns inline to avoid opening hundreds of individual files in
      // Vercel serverless (EMFILE: too many open files)
      'date-fns'
    ]
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
      'clsx',
      '@lottiefiles/dotlottie-react'
    ]
  },
})

