import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Ensure zod resolves from frontend node_modules when imported via shared
      zod: path.resolve(__dirname, 'node_modules/zod'),
    },
  },
  optimizeDeps: {
    include: ['zod'],
  },
  server: {
    proxy: {
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
      '/adventure': 'http://localhost:3000'
    },
    fs: {
      // Allow serving files from parent directory (shared folder)
      allow: ['..'],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    server: {
      deps: {
        // Transform dependencies to resolve imports properly
        inline: [/zod/, /shared/],
      },
    },
  },
});
