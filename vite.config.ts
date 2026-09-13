import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// SECURITY: no `define` block here — secrets must never be inlined into the
// browser bundle. AI calls go through the server-side /api/suggest-slug
// endpoint instead.
export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      css: {
        postcss: {
          plugins: [tailwindcss, autoprefixer],
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        force: true
      }
    };
});
