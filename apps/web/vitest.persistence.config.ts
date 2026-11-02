import { defineConfig } from 'vitest/config';

// The desktop renderer uses these same App persistence callbacks.
export default defineConfig({
  root: __dirname,
  test: {
    environment: 'node',
    include: ['src/app/pending-persistence.spec.ts', 'src/app/app-sync.spec.ts'],
  },
});
