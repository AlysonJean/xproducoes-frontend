# Domain Configuration Automation

Este diretório contém workflows automatizados para gerenciar a configuração de domínio.

## 🤖 Workflows Disponíveis

### 1. DNS Validation (`dns-validation.yml`)
**Onde:** Frontend repository
**Quando:** Manual ou diariamente às 8h

**O que faz:**
- ✅ Valida registros DNS (A, CNAME)
- 🔐 Verifica certificados SSL
- 🌐 Testa se os endpoints estão respondendo

**Como usar:**
1. Acesse: https://github.com/AlysonJean/xproducoes-frontend/actions
2. Selecione "Validate DNS Configuration"
3. Clique "Run workflow"

### 2. Update Domain Configuration (`update-domain-config.yml`)
**Onde:** Root (funciona para ambos repos)
**Quando:** Manual

**O que faz:**
- 🔧 Atualiza CORS no backend automaticamente
- 📝 Atualiza `.env.production` no frontend
- 🔀 Cria Pull Requests com as mudanças
- 📊 Gera relatório de conclusão

**Como usar:**
1. Acesse: https://github.com/AlysonJean/xproducoes-frontend/actions (ou backend)
2. Selecione "Update Domain Configuration"
3. Clique "Run workflow"
4. Preencha:
   - Frontend domain: `xproducoeseeventos.com.br`
   - API domain: `api.xproducoeseeventos.com.br`
5. Aguarde criar os PRs
6. Revise e faça merge dos PRs

## 📋 Ordem de Execução Recomendada

Ao configurar um novo domínio:

1. **Configure DNS no provedor** (manual)
   - Adicione registros A e CNAME conforme `DOMAIN_SETUP.md`

2. **Adicione domínios nas plataformas** (manual)
   - Vercel: adicione frontend e www
   - Render: adicione api subdomain

3. **Execute "Update Domain Configuration"** (workflow)
   - Atualiza código automaticamente
   - Cria PRs para revisão

4. **Faça merge dos PRs** (manual)
   - Review e merge dos PRs criados

5. **Atualize env vars nas plataformas** (manual)
   - Render: `FRONTEND_URL`, `ALLOWED_ORIGINS`
   - Vercel: verificar se está usando .env.production

6. **Redeploy** (automático via workflows existentes)
   - Push para main dispara deploys

7. **Execute "Validate DNS Configuration"** (workflow)
   - Verifica se tudo está funcionando

## 🔐 Secrets Necessários

Os workflows usam `GITHUB_TOKEN` (fornecido automaticamente).

Nenhum secret adicional é necessário para estes workflows específicos.

## 📝 Exemplo de Uso Completo

```bash
# 1. Configure DNS manualmente no seu provedor

# 2. Execute workflow de atualização
# (via GitHub Actions UI)
Frontend domain: xproducoeseeventos.com.br
API domain: api.xproducoeseeventos.com.br

# 3. PRs serão criados automaticamente em ambos repos
# Revise em:
# - https://github.com/AlysonJean/xproducoes-backend/pulls
# - https://github.com/AlysonJean/xproducoes-frontend/pulls

# 4. Faça merge dos PRs

# 5. Deploys acontecem automaticamente

# 6. Valide tudo
# Execute workflow "Validate DNS Configuration"
```

## ⚙️ Variáveis de Configuração

Os workflows são pré-configurados para:
- **Frontend:** xproducoeseeventos.com.br
- **API:** api.xproducoeseeventos.com.br

Para mudar, edite os defaults nos arquivos `.yml` ou passe valores personalizados ao executar manualmente.

## 🚨 Troubleshooting

### Workflow falhou ao criar PR
- Verifique se o `GITHUB_TOKEN` tem permissões de write
- Settings → Actions → General → Workflow permissions → "Read and write"

### DNS validation mostra avisos
- Normal se DNS ainda está propagando (até 48h)
- Execute novamente após algumas horas

### CORS ainda bloqueando requisições
- Verifique se fez merge do PR do backend
- Verifique se redeploy aconteceu
- Confirme env vars no Render
- Limpe cache do navegador

## 📚 Recursos

- [DOMAIN_SETUP.md](../DOMAIN_SETUP.md) - Guia completo de configuração manual
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vercel Domains](https://vercel.com/docs/concepts/projects/domains)
- [Render Custom Domains](https://render.com/docs/custom-domains)
