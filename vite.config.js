import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    /* Production mein source maps nahi — bundle chhota rehta hai */
    sourcemap: false,
    /* Modern JS output — chhota, fast */
    target: 'es2022',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})
