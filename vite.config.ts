import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// The backend API while developing
const BACKEND = 'http://localhost:8181'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // "@/..." means "src/..." (used by the shadcn/ui components)
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Requests to /api and /uploads are passed on to the backend, so the website and the API
    // share one address. That lets a single HTTPS tunnel (e.g. for testing on a phone) serve both.
    proxy: {
      '/api': BACKEND,
      '/uploads': BACKEND,
    },
    // Allow opening the site through a temporary Cloudflare tunnel address
    allowedHosts: ['.trycloudflare.com'],
  },
})
