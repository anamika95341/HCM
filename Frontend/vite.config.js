import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "ec2-13-201-12-198.ap-south-1.compute.amazonaws.com",
    ],
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "ec2-13-201-12-198.ap-south-1.compute.amazonaws.com",
    ],
  },
  resolve: {
    alias: {
      raf: fileURLToPath(new URL('./src/shared/vendor/raf.js', import.meta.url)),
      rgbcolor: fileURLToPath(new URL('./src/shared/vendor/rgbcolor.js', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['jspdf', 'jspdf-autotable', 'canvg', 'raf'],
  },
})
