import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: o site fica em https://<user>.github.io/<repo>/
// Ajuste "base" para o nome do seu repositorio (ex.: '/racha/').
// Se usar dominio proprio ou repositorio <user>.github.io, troque para '/'.
export default defineConfig({
  base: '/racha/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
