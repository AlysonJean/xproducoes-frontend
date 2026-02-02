# Stage 1: Build
FROM node:20-alpine as builder

WORKDIR /app

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
