# 🎬 X-Produções Frontend

Sistema de gestão de equipamentos para produção audiovisual desenvolvido em React + TypeScript + Vite.

---

## 🚀 Quick Start

```powershell
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

---

## 📋 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento (porta 5173) |
| `npm run build` | Build de produção com TypeScript check |
| `npm run build:analyze` | Build com análise de bundle (gera stats.html) |
| `npm run preview` | Preview do build de produção |
| `npm run type-check` | Verifica tipos TypeScript sem build |
| `npm run lint` | Verifica código com ESLint |
| `npm run test` | Executa testes unitários (Vitest) |
| `npm run test:e2e` | Executa testes E2E (Playwright) |

---

## 🏗️ Tech Stack

### Core
- **React 18.2.0** - UI library
- **TypeScript 5.0.2** - Type safety
- **Vite 7.1.5** - Build tool & dev server
- **React Router 6.14.2** - Routing

### Styling
- **TailwindCSS 3.4.0** - Utility-first CSS
- **PostCSS** - CSS transformations
- **Custom themes** - Light/Dark mode

### State & Forms
- **React Hook Form 7.45.2** - Form management
- **Zod 3.22.2** - Schema validation
- **React Context** - Global state

### Features
- **Vite PWA** - Progressive Web App
- **Sentry 10.11.0** - Error monitoring
- **Recharts 3.1.2** - Data visualization
- **React Big Calendar 1.8.2** - Calendar component
- **Axios 1.4.0** - HTTP client

### Testing
- **Vitest 3.2.4** - Unit tests
- **Playwright 1.50.0** - E2E tests
- **Testing Library** - Component testing

---

## 🌍 Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_API_URL=http://localhost:3000
VITE_API_TIMEOUT=30000

# Sentry (Opcional)
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=development

# App Info
VITE_APP_VERSION=1.0.0
VITE_BUILD_NUMBER=1

# OAuth (Opcional)
VITE_GOOGLE_CLIENT_ID=
VITE_FACEBOOK_APP_ID=

# Environment
VITE_NODE_ENV=development
```

**⚠️ Importante:**
- Todas as variáveis precisam começar com `VITE_` para serem acessíveis no frontend
- Nunca commite arquivos `.env` no Git
- Use `.env.local` para desenvolvimento local

---

## 🚀 Deploy Automático na Vercel

Este projeto está configurado para deploy automático na Vercel. Veja o **[Guia Completo de Deploy](./VERCEL_DEPLOY_GUIDE.md)** para instruções detalhadas.

### Deploy Rápido

1. **Conectar Repositório**
   - Acesse [vercel.com](https://vercel.com)
   - Importe o repositório do GitHub
   - Framework detectado automaticamente: **Vite**

2. **Configurar Variáveis**
   ```bash
   VITE_API_BASE_URL=https://seu-backend.com/api/v1
   VITE_API_URL=https://seu-backend.com
   # ... outras variáveis
   ```

3. **Deploy**
   - Clique em "Deploy"
   - Aguarde 2-3 minutos
   - Deploy automático em cada push!

### Arquivos de Configuração

- ✅ `vercel.json` - Configuração da Vercel (região, headers, rewrites)
- ✅ `.vercelignore` - Arquivos excluídos do deploy
- ✅ `.env.production` - Template de variáveis de produção

### Deploy Automático

```bash
# Deploy em produção (main branch)
git push origin main

# Preview deploy (outras branches)
git push origin feature/nova-funcionalidade
```

📖 **[Ver guia completo de deployment](./VERCEL_DEPLOY_GUIDE.md)**

---

## 📁 Estrutura do Projeto

```
frontend/
├── public/              # Assets estáticos
│   ├── uploads/         # Imagens de produtos
│   ├── manifest.webmanifest # PWA manifest
│   └── sw.js           # Service Worker
├── src/
│   ├── components/     # Componentes React
│   │   ├── ui/        # Componentes UI reutilizáveis
│   │   ├── forms/     # Formulários
│   │   ├── modals/    # Modais
│   │   └── layouts/   # Layouts
│   ├── contexts/      # React Contexts
│   ├── hooks/         # Custom Hooks
│   ├── pages/         # Páginas/Rotas
│   ├── services/      # API & serviços externos
│   ├── types/         # TypeScript types
│   ├── utils/         # Utilitários
│   └── validators/    # Schemas de validação (Zod)
├── vercel.json        # Configuração Vercel
├── vite.config.ts     # Configuração Vite
└── tsconfig.json      # Configuração TypeScript
```

---

## 🎨 Padrões de Código

### Imports

```typescript
// ✅ Use path aliases
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import type { Equipment } from '@/types';

// ❌ Evite imports relativos profundos
import { Button } from '../../../components/ui/Button';
```

**Path aliases configurados:**
- `@/` → `src/`
- `@/components` → `src/components`
- `@/contexts` → `src/contexts`
- `@/hooks` → `src/hooks`
- `@/pages` → `src/pages`
- `@/services` → `src/services`
- `@/types` → `src/types`
- `@/utils` → `src/utils`
- `@/validators` → `src/validators`

📖 **[Ver guia completo de imports](./IMPORT_STANDARDS.md)**

### Componentes

```typescript
// ✅ Functional components com TypeScript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', onClick, children }: ButtonProps) {
  return <button className={`btn-${variant}`} onClick={onClick}>{children}</button>;
}
```

---

## 🧪 Testes

### Testes Unitários (Vitest)

```powershell
# Rodar todos os testes
npm run test

# Watch mode
npm run test -- --watch

# Coverage
npm run test -- --coverage
```

### Testes E2E (Playwright)

```powershell
# Rodar testes E2E
npm run test:e2e

# UI mode (interativo)
npx playwright test --ui

# Debug
npx playwright test --debug
```

---

## 🔍 Análise de Bundle

```powershell
# Gerar análise de bundle
npm run build:analyze

# Abrir stats.html gerado
start stats.html
```

Analise:
- Tamanho dos bundles
- Dependências importadas
- Código duplicado
- Oportunidades de otimização

---

## 📚 Documentação

- 📖 [Guia de Deploy Vercel](./VERCEL_DEPLOY_GUIDE.md) - Deploy automático na Vercel
- 📖 [Padrões de Imports](./IMPORT_STANDARDS.md) - Convenções de imports
- 📖 [Resumo de Refatoração](./REFACTORING_SUMMARY.md) - Histórico de mudanças
- 📖 [Checklist de Validação](./VALIDATION_CHECKLIST.md) - Validações pós-deploy
- 📖 [Design System](./src/docs/DESIGN_SYSTEM_GUIDE.md) - Guia de UI/UX

---

## 🔧 Troubleshooting

### Build falha com erros de tipo

```powershell
# Limpar cache do TypeScript
rm -rf node_modules/.vite
rm tsconfig.tsbuildinfo
npm run type-check
```

### Imports não resolvem

```powershell
# Verificar configuração de paths
cat tsconfig.json | Select-String "paths"
cat vite.config.ts | Select-String "alias"
```

### API não conecta

```env
# Verificar variáveis de ambiente
cat .env.local
# Deve ter VITE_API_BASE_URL definido
```

---

## 🤝 Contribuindo

1. Clone o repositório
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: Adicionar nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Convenções de Commit

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação
- `refactor:` Refatoração
- `test:` Testes
- `chore:` Manutenção

---

## 📊 Status do Projeto

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.2-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.1.5-purple)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-Private-red)]()

**Última atualização:** 09/10/2025  
**Node version:** >=18.18.0  
**Status:** ✅ Pronto para produção

---

## 📝 Licença

Propriedade privada de X-Produções. Todos os direitos reservados.

---

## 👥 Time

Desenvolvido por **X-Produções**

📧 Contato: [contato@xproducoes.com.br](mailto:contato@xproducoes.com.br)
