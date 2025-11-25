import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'static/dist',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      // API routes
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },

      // Auth & misc Flask routes
      '/login': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/logout': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/callback': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/filter-sweep': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },

      // Optional debug endpoints you might hit from the browser
      '/diag': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/test-client': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
})
