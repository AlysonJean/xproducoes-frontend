Este diretório contém um teste E2E Playwright simples para `public/debug.html`.

Como executar localmente:

1. Instale dependências (na pasta `frontend`):

   npm install

2. Instale os navegadores do Playwright (apenas se ainda não instalados):

   npx playwright install

3. Inicie o servidor de desenvolvimento (Vite) em outra janela:

   npm run dev

4. Rode os testes E2E:

   npm run test:e2e

Observações:
- O teste abre `http://localhost:5173/debug.html`. Ajuste `baseURL` em `playwright.config.ts` se usar outra porta.
