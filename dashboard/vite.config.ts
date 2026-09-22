import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/qa-testing-agent/',
  build: {
    outDir: path.resolve(__dirname, '../docs'),
    emptyOutDir: true
  },
  server: {
    port: 3000,
    host: true
  }
});
