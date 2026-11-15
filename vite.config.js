import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    // The sandbox preview proxies through a dynamic *.e2b.app host.
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Keep heavy vendors in their own cacheable chunks
        manualChunks: {
          three: ['three'],
          gsap: ['gsap'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
