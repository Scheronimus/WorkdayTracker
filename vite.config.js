import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/WorkdayTracker/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Workday Tracker',
        short_name: 'Workday',
        description: 'Simple workday and customer visit tracker',
        theme_color: '#111827',
        background_color: '#f5f7fc',
        display: 'standalone',
        start_url: '/WorkdayTracker/',
        scope: '/WorkdayTracker/',
        icons: [
          {
            src: '/WorkdayTracker/app-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/WorkdayTracker/app-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})
