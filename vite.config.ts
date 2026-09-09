// Ensure ESM plugins like vite-plugin-pwa resolve their own package.json instead of tsx global '.'
try {
  delete (global as any)['__dir' + 'name'];
  delete (globalThis as any)['__dir' + 'name'];
  delete (global as any)['__file' + 'name'];
  delete (globalThis as any)['__file' + 'name'];
} catch {
  // ignore
}

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const projectRootDir = path.dirname(fileURLToPath(import.meta.url));

// Prepend error filter before any dev module scripts execute
function suppressViteHmrLogsPlugin(): Plugin {
  return {
    name: 'suppress-vite-hmr-logs',
    enforce: 'pre',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [
          {
            tag: 'script',
            attrs: { type: 'text/javascript' },
            children: `
(function() {
  function isViteNotice(arg) {
    if (!arg) return false;
    try {
      if (typeof arg === 'string') return /\\[vite\\]|vite|websocket|ws:\\/\\/|wss:\\/\\//i.test(arg);
      if (arg.message && /\\[vite\\]|vite|websocket|ws:\\/\\/|wss:\\/\\//i.test(String(arg.message))) return true;
      if (arg.reason && /\\[vite\\]|vite|websocket|ws:\\/\\/|wss:\\/\\//i.test(String(arg.reason))) return true;
      if (arg.stack && /\\[vite\\]|vite|websocket/i.test(String(arg.stack))) return true;
      if (arg.filename && /vite|@vite/i.test(String(arg.filename))) return true;
      if (arg.target && (arg.target instanceof WebSocket || (arg.target.url && /ws/i.test(arg.target.url)))) return true;
      return /\\[vite\\]|vite|websocket|ws:\\/\\/|wss:\\/\\//i.test(String(arg));
    } catch (_) {
      return false;
    }
  }

  ['error', 'warn', 'info', 'debug', 'log'].forEach(function(method) {
    var orig = console[method];
    if (!orig) return;
    console[method] = function() {
      for (var i = 0; i < arguments.length; i++) {
        if (isViteNotice(arguments[i])) return;
      }
      return orig.apply(console, arguments);
    };
  });

  window.addEventListener('error', function(e) {
    if (isViteNotice(e) || isViteNotice(e.error) || isViteNotice(e.message) || (e.filename && isViteNotice(e.filename))) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return true;
    }
  }, true);

  window.addEventListener('unhandledrejection', function(e) {
    if (isViteNotice(e) || isViteNotice(e.reason) || (e.reason && isViteNotice(e.reason.message)) || (e.reason && isViteNotice(e.reason.stack))) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return true;
    }
  }, true);
})();
`,
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      suppressViteHmrLogsPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg', 'brand-logo.jpg', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
        manifest: {
          id: '/',
          name: 'HMIS - Hospital Management Information System',
          short_name: 'HMIS App',
          description: 'The Tassia Hill Hospital Multi-Tenant Hospital Management Information System (HMIS) with offline resilience, installable on iPhone, Android, and all web browsers.',
          theme_color: '#047857',
          background_color: '#047857',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
          orientation: 'any',
          start_url: '/',
          scope: '/',
          categories: ['medical', 'health', 'productivity', 'business'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          importScripts: ['/sw-push-listener.js'],
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(projectRootDir, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});
