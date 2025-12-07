import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['penguin-icon-192.png', 'penguin-icon-512.png', 'assets/**/*', '.well-known/**/*'],
      manifest: {
        name: 'PenGuin Alarm',
        short_name: 'PenGuin',
        description: '귀여운 펭귄 테마 알람 시계 애플리케이션',
        theme_color: '#6b4cff',
        background_color: '#0a0a1a',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'ko',
        id: '/',
        scope: '/',
        start_url: '/',
        prefer_related_applications: false,
        icons: [
          {
            src: 'penguin-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'penguin-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff,woff2,webp,mp3,wav}']
      },
      devOptions: {
        enabled: true
      }
    })
  ],
})
