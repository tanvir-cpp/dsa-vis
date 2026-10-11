import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base set for GitHub Pages repo subpath.
export default defineConfig({
  plugins: [react()],
  base: '/dsa_project/',
});
