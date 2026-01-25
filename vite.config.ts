
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            // Исключаем API запросы из кэширования, чтобы данные всегда были актуальными
            urlPattern: ({ url }) => url.hostname.includes('supabase.co') || url.hostname.includes('google'),
            handler: 'NetworkOnly',
          }
        ]
      },
      manifest: {
        name: 'DriverLog Pro',
        short_name: 'DriverLog',
        description: 'Профессиональный журнал учета времени вождения и отдыха для водителей-международников.',
        theme_color: '#10b981',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
