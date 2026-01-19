import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        // Указываем библиотеки как внешние, так как они загружаются через importmap в index.html
        external: [
          'react',
          'react-dom',
          'react-dom/client',
          'leaflet',
          'react-leaflet',
          '@google/genai',
          '@supabase/supabase-js'
        ],
      }
    },
    server: {
      port: 3000
    }
  };
});