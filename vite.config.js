import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],

  // ─── Build optimization ───
  build: {
    // Source maps disable — bundle size 75% kam ho jati hai
    sourcemap: false,

    // Modern target — smaller output, faster runtime
    target: 'es2022',

    // Minification: terser (default se better)
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,      // console.log hatao production se
        drop_debugger: true,     // debugger statements hatao
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      format: {
        comments: false,         // comments hatao
      },
    },

    // Chunk size warning limit
    chunkSizeWarningLimit: 600,

    // CSS code splitting
    cssCodeSplit: true,

    // Asset inline limit (chhoti images base64)
    assetsInlineLimit: 4096,

    // Rollup options — manual chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // React core alag chunk
          'react-vendor': ['react', 'react-dom'],
        },
        // Content-hashed filenames for cache busting
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },

  // ─── Dev server ───
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // HMR for phone testing
    hmr: {
      clientPort: 5173,
    },
  },

  // ─── Dependency optimization ───
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
