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
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/login': 'http://localhost:5000',
      '/callback': 'http://localhost:5000',
      '/logout': 'http://localhost:5000',
      '/filter-sweep': 'http://localhost:5000'
    }
  }
})
