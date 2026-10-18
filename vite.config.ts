import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const FONT_CACHE_DAYS = 365;

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
    // PWA (T-12). Registration lives in src/client/pwa, so no virtual module is injected.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        id: '/',
        name: 'Frenchy',
        short_name: 'Frenchy',
        description: 'Learn French next to your book: reader, flashcards and a daily streak.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#2B59F0',
        background_color: '#F6F8FF',
        categories: ['education'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // G-27: the dev-only MSW worker is copied from public/; never precache it.
        globIgnores: ['**/mockServiceWorker.js'],
        navigateFallback: '/index.html',
        // L-11: /api/* must always reach the Worker, never the cached index.html.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // A function: a RegExp is matched against the full URL, so ^\/api would never hit.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /^\/(content|lexicon)\//.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'content' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 30, maxAgeSeconds: FONT_CACHE_DAYS * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
});
