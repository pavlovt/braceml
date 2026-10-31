import react from '@vitejs/plugin-react';
import { braceml } from '@braceml/react/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  // braceml() must run before react()
  plugins: [braceml(), react()],
});
