import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 6789,
    host: '0.0.0.0', // 允许外部访问
    strictPort: false,
  },
}) 