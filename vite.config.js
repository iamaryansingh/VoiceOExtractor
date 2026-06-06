import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'src/main.js',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['ffmpeg-static', 'fluent-ffmpeg']
            }
          }
        }
      },
      preload: {
        input: 'src/preload.js',
        vite: {
          build: {
            outDir: 'dist-electron'
          }
        }
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
