import { defineConfig, type Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function figmaAssetResolver(): Plugin {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

// The Vercel deployment is a public demo, so its build shows the demo sign-in buttons
// unless VITE_ENABLE_DEMO_LOGIN is set explicitly. Mirrors the server rule in server/api.mjs.
const vercelDemoLogin = process.env.VERCEL && process.env.VITE_ENABLE_DEMO_LOGIN === undefined
  ? { 'import.meta.env.VITE_ENABLE_DEMO_LOGIN': JSON.stringify('true') }
  : {}

export default defineConfig({
  define: vercelDemoLogin,
  server: {
    proxy: { '/api': 'http://127.0.0.1:5174' },
    watch: {
      ignored: ['**/data/**', '**/dist/**', '**/.npm-cache/**', '**/.pnpm-store/**', '**/vite-dev*.log', '**/vite-dev.pid', '**/.tmp-*/**'],
    },
  },
  plugins: [figmaAssetResolver(), react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
