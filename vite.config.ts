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
      includeAssets: ['favicon.svg', 'xproducoes-logo.svg', 'apple-touch-icon.png'],
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
          // "any": ícone original (fundo transparente), usado como está, sem máscara de forma.
          {
            src: 'favicon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'favicon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          // "maskable": fundo sólido + logo com folga na zona de segurança (~55% do
          // canvas), para sobreviver a máscaras circulares/squircle de launchers Android.
          // Nunca reaproveitar o ícone "any" aqui: com fundo transparente, o SO
          // preenche a área cortada com uma cor default (geralmente preta), quebrando o visual.
          {
            src: 'maskable-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
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
            // React core - always separate for framework updates.
            // Achado (produção real, Safari/WebKit): react-hook-form importa createContext
            // do React no próprio topo do módulo — separá-lo do chunk do React (como uma
            // tentativa anterior desta mesma sessão fez, agrupando-o com zod em
            // 'vendor-forms') cria uma referência circular entre chunks cuja ordem de
            // execução o V8/Chrome tolera mas o JavaScriptCore do Safari não: "Cannot
            // access 'e' before initialization" ao tentar ler createContext antes do chunk
            // do React terminar de rodar seu código de topo. react-hook-form/@hookform-
            // resolvers precisam ficar no MESMO chunk que o React.
            if (
              id.includes('react/') ||
              id.includes('react-dom/') ||
              id.includes('react-router-dom') ||
              id.includes('scheduler') ||
              id.includes('react-hook-form') ||
              id.includes('@hookform/resolvers')
            ) return 'vendor-react';

            // UI Library components + clsx (utilitário de className usado por praticamente
            // todo componente de UI do app — acompanha os libs de ícone/UI de propósito).
            if (
              id.includes('@heroicons/react') ||
              id.includes('@headlessui/react') ||
              id.includes('lucide-react') ||
              id.includes('/clsx/')
            ) return 'vendor-ui';

            // Data & state management (date-fns é utilitário genérico de data, usado em
            // páginas fora de admin/colaborador — não deve compartilhar chunk com recharts).
            if (
              id.includes('axios') ||
              id.includes('zustand') ||
              id.includes('@tanstack/react-query') ||
              id.includes('date-fns')
            ) return 'vendor-data';

            // Achado (auditoria de performance): jsPDF/html2canvas (~300KB) e recharts
            // (~112KB) caíam no "return null" abaixo (sem regra própria) e o Rollup os
            // agrupava com o que quer que mais fosse amplamente usado por outras páginas
            // (ex.: react-ga4, carregado sempre via useGoogleAnalytics) — como o chunk
            // resultante virava elegível em MUITAS páginas, o Vike (que só confia no grafo
            // de imports estáticos do manifest, não em quem realmente usa React.lazy())
            // pré-carregava esse peso todo até na home pública. Isolados em chunks
            // próprios para não arrastar nada alheio a eles.
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('canvg')) {
              return 'vendor-pdf';
            }

            // Charting & visualization
            if (id.includes('recharts') || id.includes('chart.js')) return 'vendor-charts';

            // Real-time (chat/notificações) — mantido isolado por peso e para não
            // compartilhar chunk com PDF/gráficos.
            if (
              id.includes('socket.io-client') ||
              id.includes('engine.io-client') ||
              id.includes('engine.io-parser') ||
              id.includes('socket.io-parser') ||
              id.includes('@socket.io/component-emitter')
            ) return 'vendor-realtime';

            // Validação — usado amplamente (público + admin), mas peso bem menor que
            // PDF/gráficos; isolado principalmente para não compartilhar chunk com eles.
            // Sem dependência de React (zero deps), seguro isolar sozinho.
            if (id.includes('zod')) return 'vendor-forms';

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

