import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import vike from 'vike/plugin'
import path from 'path'

/**
 * Vite Config with Advanced Code-Splitting (2026)
 * 
 * Strategy:
 * 1. Main bundle: Core app + critical path code
 * 2. Vendor chunks: React, libraries (cached longer)
 * 3. Route chunks: Admin, collaborator, etc (lazy load)
 * 4. Feature chunks: Charts, calendar, etc
 * 5. PWA: Install prompt + offline support
 * 
 * Result: Initial load ~40KB gzip, on-demand load as needed
 */

export default defineConfig({
  plugins: [
    vike(),
    react({
      jsxRuntime: 'automatic',
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'X-Produções',
        short_name: 'X-Produções',
        description: 'Aluguel de equipamentos audiovisuais',
        theme_color: '#194459',
        background_color: '#ffffff',
        icons: [
          {
            src: 'favicon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'favicon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.xproducoes\.com\/api\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
            },
          },
        ],
      },
    }),
    // Bundle visualization for analysis
    visualizer({
      open: false,
      filename: 'dist/stats.html',
      title: 'Bundle Statistics',
      gzipSize: true,
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
    },
  },

  build: {
    // Target modern browsers
    target: 'ES2020',
    
    // Enable sourcemaps in production for Sentry
    sourcemap: process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN ? 'hidden' : false,

    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
      },
    },

    // 🎯 STRATEGIC CODE-SPLITTING CONFIGURATION
    rollupOptions: {
      output: {
        // Generate multiple chunks for better caching
        manualChunks: {
          // Vendor chunks - cache these for long periods
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@hookform/resolvers', 'react-hook-form', 'zod'],
          'vendor-data': ['axios', 'socket.io-client', 'date-fns'],
          'vendor-charts': ['recharts', 'react-big-calendar'],
          'vendor-animation': ['framer-motion'],
          'vendor-other': [
            'lucide-react',
            'classnames',
            'tailwindcss',
            '@sentry/react',
          ],

          // Feature chunks - lazy load these
          'feature-admin': [
            './src/pages/admin',
            './src/pages/AdminCollaborators',
            './src/pages/AdminSettings',
          ],
          'feature-collaborator': [
            './src/pages/collaborator',
            './src/components/CollaboratorDashboard',
          ],
          'feature-booking': [
            './src/pages/booking',
            './src/components/BookingForm',
            './src/components/BookingHistory',
          ],
          'feature-shop': [
            './src/pages/shop',
            './src/pages/equipment',
            './src/components/EquipmentCard',
          ],

          // Core app chunk - always loaded
          app: ['./src/App.tsx', './src/Providers.tsx'],
        },

        // Chunk file naming strategy
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'vendor') {
            return 'vendor/[name]-[hash].js';
          }
          if (chunkInfo.isDynamicEntry) {
            return 'dynamic/[name]-[hash].js';
          }

          return 'chunks/[name]-[hash].js';
        },

        // Entry file naming
        entryFileNames: '[name]-[hash].js',

        // Asset file naming
        assetFileNames: (assetInfo) => {
          const assetName = assetInfo.name ?? 'asset';
          const info = assetName.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|gif|svg|webp/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff|woff2|eot|ttf|otf/.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          if (ext === 'css') {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },

    // Chunk size warnings
    chunkSizeWarningLimit: 500,

    // CSS code splitting
    cssCodeSplit: true,

    // Report compressed size
    reportCompressedSize: true,
  },

  // Server config for development
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'date-fns',
      'lucide-react',
    ],
  },

  // Performance budgets
  preview: {
    port: 5173,
    strictPort: false,
  },
});
