import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/virtue-companion/',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [vue()],
  build: {
    chunkSizeWarningLimit: 2000,
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'https://www.auxbrain.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
    forwardConsole: {
      unhandledErrors: true,
      logLevels: ['warn', 'error'],
    },
  },
});
