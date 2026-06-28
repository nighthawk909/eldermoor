import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',       // sim is headless — no DOM/WebGL
    include: ['tests/**/*.test.ts'],
  },
});
