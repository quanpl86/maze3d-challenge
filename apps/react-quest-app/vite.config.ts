import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import sirv from 'sirv';  // Add this import

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    {
      name: 'serve-quest-player-assets',
      configureServer(server) {
        // Serve /assets/* from the quest-player package's public/assets
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
    alias: {
      '/assets': path.resolve(__dirname, '../../packages/quest-player/public/assets')
    },
    dedupe: [
      'blockly'
    ]
  }
});