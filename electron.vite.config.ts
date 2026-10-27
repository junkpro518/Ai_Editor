import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

// حزمة واحدة بثلاثة أهداف (plan.md §Project Structure): main / preload / renderer.
// src/core يُستورد من renderer (تنفيذ الأوامر هناك) ومن main (التحقق فقط).
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { rollupOptions: { input: 'src/main/index.ts' } },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    // CJS حتى يعمل مع sandbox: true (الـsandbox يرفض ESM في preload)
    build: { rollupOptions: { input: 'src/preload/index.ts', output: { format: 'cjs' } } },
  },
  renderer: {
    plugins: [react()],
    build: { rollupOptions: { input: 'src/renderer/index.html' } },
  },
});
