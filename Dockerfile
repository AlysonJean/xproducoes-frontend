# ⚠️ Achado (auditoria): este Dockerfile NÃO reflete a arquitetura de produção real.
# A produção roda no Vercel como SSR serverless (renderer/+onRenderHtml.tsx via
# renderToStream(), servido por api/ssr.js — ver vercel.json). Este Dockerfile builda
# um bundle estático (vike build) e serve via Nginx puro, sem nenhum servidor Node —
# ou seja, sem SSR, sem meta tags dinâmicas, potencialmente com rotas quebradas.
# Não é referenciado por nenhum README ou workflow de CI deste repo (verificado);
# mantido apenas para o stack local de docker-compose.yml (Postgres/Redis + backend).
# Para reproduzir o comportamento real de SSR localmente, use `npm run dev`
# (server.ts) no lugar deste container.
# Stage 1: Build
FROM node:20-alpine as builder

WORKDIR /app

# Declarar ARGs para variáveis de ambiente do Vite (necessárias no build)
ARG VITE_API_URL
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_FACEBOOK_APP_ID
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENVIRONMENT=production
ARG VITE_APP_VERSION
ARG VITE_BUILD_NUMBER
ARG VITE_GOOGLE_ANALYTICS_ID

# Expor ARGs como ENV para o build do Vite
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_FACEBOOK_APP_ID=$VITE_FACEBOOK_APP_ID
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_SENTRY_ENVIRONMENT=$VITE_SENTRY_ENVIRONMENT
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_BUILD_NUMBER=$VITE_BUILD_NUMBER
ENV VITE_GOOGLE_ANALYTICS_ID=$VITE_GOOGLE_ANALYTICS_ID

# Copiar package files e instalar dependências
COPY package*.json ./
RUN npm ci --only=production=false

# Copiar código fonte e fazer build
COPY . .
RUN npm run build

# Stage 2: Serve com Nginx
FROM nginx:alpine

# Copiar build do estágio anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Adicionar healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80 || exit 1

# Expor porta
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
