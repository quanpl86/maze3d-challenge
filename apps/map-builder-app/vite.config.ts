import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'url';
import sirv from 'sirv';
import { viteStaticCopy } from 'vite-plugin-static-copy'; // <-- 1. Import plugin

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(), 
    tsconfigPaths(),
    // Middleware này vẫn cần thiết cho môi trường DEV để có hot-reloading
    {
      name: 'serve-quest-player-assets-for-builder-dev',
      configureServer(server) {
        const assetsDir = path.resolve(__dirname, '../../packages/quest-player/public/assets');
        server.middlewares.use('/assets', sirv(assetsDir, { dev: true, etag: true, single: false }));
      },
    },
    // --- 2. Thêm plugin mới để sao chép file khi BUILD ---
    viteStaticCopy({
      targets: [
        {
          // Nguồn: thư mục assets trong quest-player
          src: path.resolve(__dirname, '../../packages/quest-player/public/assets'),
          // Đích: thư mục gốc của thư mục build (dist)
          dest: '.' 
        }
      ]
    })
  ],
  server: {
    fs: {
      allow: [path.resolve(__dirname, '../../')],
    },
  },
});