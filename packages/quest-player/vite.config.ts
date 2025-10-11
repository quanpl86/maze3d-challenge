// packages/quest-player/vite.config.ts
    
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import path from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy'; // Import plugin

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
    }),
    // Thêm plugin vào đây
    viteStaticCopy({
      targets: [
        {
          // Copy tất cả mọi thứ từ thư mục public của package
          src: path.resolve(__dirname, 'public/*'), 
          // Đến thư mục gốc của output (dist)
          dest: './' 
        }
      ]
    })
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'QuestPlayer',
      formats: ['es', 'umd'],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'three': 'THREE',
          '@react-three/fiber': 'ReactThreeFiber',
          '@react-three/drei': 'ReactThreeDrei',
        },
      },
    },
  },
});