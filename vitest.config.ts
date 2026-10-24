import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    // The API integration test shares one database, so run files one at a time.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
