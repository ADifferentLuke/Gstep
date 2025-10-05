import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls during dev to Spring Boot on 8080
      '/genetics': 'http://localhost:8080'
    }
  },
  build: { outDir: 'dist' }
});
