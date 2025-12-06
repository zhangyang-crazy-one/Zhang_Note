import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isElectron = process.env.ELECTRON === 'true';

    return {
      server: {
        port: 3000,
        strictPort: false,
        host: '0.0.0.0',
        proxy: {
          // Proxy for DeepSeek API to bypass CORS in browser dev mode
          '/api/deepseek': {
            target: 'https://api.deepseek.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/deepseek/, ''),
            secure: true,
          },
          // Proxy for OpenAI API
          '/api/openai': {
            target: 'https://api.openai.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/openai/, ''),
            secure: true,
          },
        },
      },
      base: isElectron ? './' : '/',
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              markdown: ['react-markdown', 'remark-gfm', 'remark-math', 'rehype-katex', 'rehype-highlight'],
              visualization: ['d3', 'mermaid'],
            }
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        exclude: ['better-sqlite3']
      }
    };
});
