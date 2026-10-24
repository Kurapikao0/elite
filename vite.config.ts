import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { cpSync, mkdirSync } from 'node:fs';

const pages = ['index', 'legends', 'dukes', 'admirals', 'news', 'fun', 'admin'];

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), {
    name: 'copy-legacy-public-assets',
    closeBundle() {
      const output = resolve(__dirname, 'dist');
      cpSync(resolve(__dirname, 'assets'), resolve(output, 'assets'), { recursive: true, force: true });
    },
  }],
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map((page) => [page, resolve(__dirname, `${page}.html`)])),
    },
  },
}));
