import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 允许外部访问
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://192.168.31.206:3001', // 使用局域网IP
        changeOrigin: true,
      },
    },
  },
})
