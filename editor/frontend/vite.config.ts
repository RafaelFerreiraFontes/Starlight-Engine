import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
// Generated output belongs in a user cache: subprocess writes to this OneDrive
// repository were denied by the Windows environment. Source stays in the repo.
const cacheRoot=resolve(process.env.LOCALAPPDATA??tmpdir(),'Starlight','editorial-builds');
const projectKey=createHash('sha256').update(process.cwd()).digest('hex').slice(0,12);
export const editorialOutputDir=resolve(cacheRoot,projectKey);
if(!editorialOutputDir.startsWith(cacheRoot+sep))throw new Error('Build output must stay inside the Starlight cache');
export default defineConfig({
  plugins: [react(), tailwind(), viteSingleFile()],
  base: './',
  build: { chunkSizeWarningLimit: 1600, outDir:editorialOutputDir, emptyOutDir: true },
});
