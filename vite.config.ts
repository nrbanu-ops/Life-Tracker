/// <reference types="vitest/config" />
import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app under /<repo>/; the deploy workflow sets BASE_PATH.
const base = process.env.BASE_PATH ?? '/'

/** Shown in Settings so it's easy to see that an update arrived: date + commit. */
function appVersion(): string {
  const date = new Date().toISOString().slice(0, 10)
  let commit = process.env.GITHUB_SHA?.slice(0, 7)
  if (!commit) {
    try {
      commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    } catch {
      commit = 'yerel'
    }
  }
  return `${date} · ${commit}`
}

// https://vite.dev/config/
export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A new version takes over as soon as it's downloaded; main.tsx checks for one regularly.
      registerType: 'autoUpdate',
      injectRegister: false,
      // Without these the new worker waits for a SKIP_WAITING message nobody sends, and updates never apply.
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // jpg too, so the background picture works offline.
        globPatterns: ['**/*.{js,wasm,css,html,jpg}'],
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'Life Tracker',
        short_name: 'Life Tracker',
        description: 'Projeler, alışkanlıklar ve istatistikler',
        lang: 'tr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#dce6f3',
        theme_color: '#dce6f3',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Full-bleed square: a launcher that masks the icon crops its own shape out of this.
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
