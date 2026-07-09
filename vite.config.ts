import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'RedZone',
        short_name: 'RedZone',
        description: 'RedZone WISP — manage your account and operations',
        theme_color: '#0b1f3a',
        background_color: '#0b1f3a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      }
    })
  ],
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } }
});
