import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const isElectron = process.env.BUILD_TARGET === 'electron';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Use relative paths for Electron (file:// protocol) vs absolute for web
  base: isElectron ? './' : '/',
  server: {
    port: 3000,
    host: true,
  },
  build: {
    // Output to dist/ for both web and Electron
    outDir: 'dist',
    // Generate sourcemaps for debugging
    sourcemap: isElectron ? false : true,
  },
})
