import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Versão do build: o commit no GitHub Actions; local, a hora do build.
// O app compara com public /version.json para se atualizar sozinho.
const versao = process.env.GITHUB_SHA?.slice(0, 7) || String(Date.now());

// GitHub Pages: o site fica em https://<user>.github.io/<repo>/
// Ajuste "base" para o nome do seu repositorio (ex.: '/racha/').
// Se usar dominio proprio ou repositorio <user>.github.io, troque para '/'.
export default defineConfig({
  base: '/racha/',
  define: { __APP_VERSION__: JSON.stringify(versao) },
  plugins: [
    react(),
    {
      name: 'racha-versao',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ versao }) });
      },
    },
  ],
  test: {
    environment: 'node',
  },
});
