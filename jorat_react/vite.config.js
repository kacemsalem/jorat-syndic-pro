import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const djangoHost = process.env.DJANGO_HOST || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: djangoHost,
        changeOrigin: true,
        secure: false,
      },
      '/media': {
        target: djangoHost,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
