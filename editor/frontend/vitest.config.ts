import { defineConfig } from 'vitest/config';
export default defineConfig({
  // Run-mode validation needs no file watcher (including OneDrive reparse points).
  server:{watch:null},
  test:{include:['tests/**/*.test.ts','tests/**/*.test.tsx'],pool:'threads',maxWorkers:1,minWorkers:1,watch:false},
});
