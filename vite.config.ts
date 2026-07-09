import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = env.PORT || '8787'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/fhir': {
          target: `http://localhost:${port}`,
          changeOrigin: true,
        },
      },
    },
  }
})
