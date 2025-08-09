import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // dev server port
  },
  preview: {
    port: 3000, // preview (npm start) port
  },
  build: {
    outDir: 'build', // <-- Add this line
  },
}); 