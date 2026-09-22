import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/qa-testing-agent/',
  server: {
    port: 3000,
    host: true
  }
});
