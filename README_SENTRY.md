# Ativar Sentry localmente

Passos para ativar e testar o Sentry no frontend:

1) Obtenha o DSN do seu projeto Sentry

   - Acesse sentry.io e copie o DSN do projeto desejado.

2) Configure as variáveis de ambiente

   - Crie um arquivo `.env.local` na raiz do `frontend/` (NÃO commite este arquivo).
   - Defina as variáveis necessárias. Exemplo mínimo:

     VITE_SENTRY_DSN=https://<public_key>@sentry.io/<project_id>
     VITE_SENTRY_ENVIRONMENT=development
     VITE_APP_VERSION=1.0.0

3) Reinicie o dev server

   - Pare o servidor dev e rode novamente `npm run dev` dentro de `frontend/`.

4) Teste o envio de erro manualmente

   - Abra o console do navegador e execute:

     // forçar um erro e enviar ao Sentry
     throw new Error('Sentry test error');

   - Ou dinamicamente no código, chame `sentry.captureException(new Error('test'))` após importar o export `sentry` de `src/main.tsx`.

5) Verifique no painel do Sentry

   - Vá ao projeto no Sentry e confirme que o evento apareceu.

Notas de segurança

- Nunca commit suas chaves DSN em repositórios públicos.

- Em produção, defina `VITE_SENTRY_ENVIRONMENT=production` e ajuste `tracesSampleRate` conforme a política de privacidade.

Se quiser, eu posso:

- Adicionar um pequeno endpoint de teste que dispara um erro para validar a pipeline automaticamente.

- Ou configurar um workflow de CI que cria o release no Sentry (requer SENTRY_AUTH_TOKEN).
