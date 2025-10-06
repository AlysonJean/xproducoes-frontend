# Instruções: Adicionar VERCEL_TOKEN ao GitHub

Você tem o token Vercel: `wyxe3bkZsQDPZX8ZCLukzxme`

## Opção 1: Via GitHub Web (recomendado)

1. Vá para: https://github.com/AlysonJean/xproducoes-frontend/settings/secrets/actions
2. Clique em "New repository secret"
3. Name: `VERCEL_TOKEN`
4. Value: `wyxe3bkZsQDPZX8ZCLukzxme`
5. Clique "Add secret"

## Opção 2: Via GitHub CLI (se instalado)

```powershell
cd 'd:\agora vai\frontend'
gh secret set VERCEL_TOKEN --body "wyxe3bkZsQDPZX8ZCLukzxme"
```

## Testar localmente antes (recomendado)

```powershell
cd 'd:\agora vai\frontend'
.\test-vercel-deploy.ps1 -token "wyxe3bkZsQDPZX8ZCLukzxme" -target preview
```

## Testar via GitHub Actions (depois de adicionar secret)

1. Vá para: https://github.com/AlysonJean/xproducoes-frontend/actions
2. Selecione workflow "Vercel Deploy (frontend)"
3. Clique "Run workflow"
4. Escolha target (preview ou production)
5. Clique "Run workflow"

## Próximos passos

Após adicionar o secret e testar:
- Push para `main` → deploy automático em produção
- Workflow dispatch → deploy manual (preview por padrão)
