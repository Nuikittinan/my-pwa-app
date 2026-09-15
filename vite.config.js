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
        name: 'ระบบประปาหมู่บ้าน',
        short_name: 'ประปาหมู่บ้าน',
        description: 'ระบบจดมิเตอร์ ออกบิล และตรวจชำระเงินแบบ offline-first',
        theme_color: '#0f172a',
        background_color: '#f5f7fb',
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
