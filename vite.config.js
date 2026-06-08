import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        // Points at `wrangler pages dev` (Hono Functions + local D1), not the old FastAPI port.
        target: (globalThis && globalThis.process && globalThis.process.env && globalThis.process.env.VITE_API_URL) || 'http://localhost:8788',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
})
