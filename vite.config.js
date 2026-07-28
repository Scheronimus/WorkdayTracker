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
        theme_color: '#176b58',
        background_color: '#f4f7f6',
        display: 'standalone',
        start_url: '/WorkdayTracker/',
        scope: '/WorkdayTracker/',
      },
    }),
  ],
})
