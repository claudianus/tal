// tools/loud.mjs 전용: 고치는 동안 페이지가 새로 고쳐지지 않게 (HMR·감시 끔)
import { defineConfig } from 'vite';
export default defineConfig({ base: './', server: { port: 5199, strictPort: true, hmr: false, watch: null } });
