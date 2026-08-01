import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API lives in serverless functions under /api and is served by `vercel dev`
// in local development (and by Vercel in production). When running the bare Vite
// dev server (`npm run dev:web`) the proxy below forwards /api to a locally
// running `vercel dev` instance if you prefer to split the two processes.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
