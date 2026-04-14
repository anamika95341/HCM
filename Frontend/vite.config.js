import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const minioProxyTarget = process.env.VITE_MINIO_PROXY_TARGET
const apiProxyTarget = process.env.API_UPSTREAM || 'http://127.0.0.1:3000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    // When VITE_API_BASE_URL is relative (/api/v1), dev server must forward /api to the backend.
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      ...(minioProxyTarget ? {
        "/portal-private-files": {
          target: minioProxyTarget,
          changeOrigin: false,
        },
        "/minio": {
          target: minioProxyTarget,
          changeOrigin: false,
        },
      } : {}),
    },
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "ec2-13-201-12-198.ap-south-1.compute.amazonaws.com",
    ],
  },
  preview: {
    host: "0.0.0.0",
    // Matches dev server: `vite preview` after a build with relative VITE_API_BASE_URL must proxy /api.
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      ...(minioProxyTarget ? {
        "/portal-private-files": {
          target: minioProxyTarget,
          changeOrigin: false,
        },
        "/minio": {
          target: minioProxyTarget,
          changeOrigin: false,
        },
      } : {}),
    },
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
