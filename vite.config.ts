import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['posthog-js'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      external: ['@capacitor-mlkit/barcode-scanning', 'posthog-js'],
      output: {
        manualChunks(id) {
          if (id.includes('react-dom') || id.includes('react-router')) return 'vendor'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('@tanstack')) return 'query'
          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('leaflet')) return 'leaflet'
          if (id.includes('react-markdown') || id.includes('remark-gfm') || id.includes('dompurify')) return 'markdown'
          if (id.includes('@dnd-kit')) return 'dnd-kit'
          if (id.includes('i18next')) return 'i18n'
        },
      },
    },
  },
})
