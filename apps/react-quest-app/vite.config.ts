import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import sirv from 'sirv';
import tsconfigPaths from 'vite-tsconfig-paths'; // THÊM DÒNG NÀY

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    tsconfigPaths(), // THÊM DÒNG NÀY
    {
      name: 'serve-quest-player-assets',
      configureServer(server) {
        const assetsDir = path.resolve(__dirname, '../../packages/quest-player/public/assets');
        server.middlewares.use('/assets', sirv(assetsDir, { dev: true, etag: true, single: false }));
      },
    },
    react(),
  ],
  
  publicDir: './public',

  server: {
    fs: {
      allow: [
        path.resolve(__dirname, '../../'),
        path.resolve(__dirname, '../../packages/quest-player'),
      ],
    },
  },
  
  resolve: {
    // XÓA BỎ HOÀN TOÀN KHỐI `alias` CŨ
    dedupe: [
      'blockly'
    ]
  }
});