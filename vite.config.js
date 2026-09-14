import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'My Awesome PWA',
        short_name: 'MyPWA',
        description: 'เว็บแอป PWA ตัวแรกของฉัน',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '1427745.png',
            sizes: '512x512',
            type: 'image/png'
          }
        
        ]
      }
    })
  ]
})