import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        // 后端没起时给一句人话，而不是干巴巴的 502
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            console.error('[vite-proxy] 后端 8787 未响应——请在项目根目录运行 pnpm dev（或单独启动 apps/server）');
            if (res && 'writeHead' in res) {
              res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('后端未启动：请在项目根目录运行 pnpm dev');
            }
          });
        },
      },
      '/files': 'http://localhost:8787',
    },
  },
})
