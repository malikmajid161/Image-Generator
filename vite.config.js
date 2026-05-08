import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In local dev, proxy /api/* to Vercel CLI (vercel dev) on port 3000
    // Run: npx vercel dev  (instead of npm run dev) for full local API support
    // Or run: npm run dev  for frontend-only (images will use Pollinations fallback)
    proxy: {
      '/api': {
        target:       'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
