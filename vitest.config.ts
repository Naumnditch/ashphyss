import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  // Next.js keeps `jsx: preserve` in tsconfig for its own compiler, so tell
  // esbuild to actually transform JSX when vitest renders components.
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
  },
});
