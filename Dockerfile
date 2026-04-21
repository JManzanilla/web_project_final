# ── Etapa 1: build del frontend ───────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

ENV VITE_API_URL=https://torneo-api-167747831325.us-central1.run.app

RUN npx vite build

# ── Etapa 2: servidor nginx ────────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/dist/public /usr/share/nginx/html

# Config para SPA (redirige todo a index.html)
RUN echo 'server { \
  listen 8080; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { try_files $uri $uri/ /index.html; } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
