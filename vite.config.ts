import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/alfred/',
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      '/api/withings': {
        target: 'https://wbsapi.withings.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/withings/, ''),
      },
    },
  },
})
