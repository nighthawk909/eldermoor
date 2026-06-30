import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Studio is a standalone tool; base is relative so it can be served from any path.
export default defineConfig({
  base: './',
  plugins: [react()],
});
