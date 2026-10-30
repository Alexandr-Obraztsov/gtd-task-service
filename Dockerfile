# syntax=docker/dockerfile:1.7

# --- Стадия 1: зависимости (только production, с нативной сборкой bcrypt при необходимости)
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=5000

# --- Стадия 2: рабочий образ
FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    PORT=10000 \
    TRUST_PROXY=1 \
    LOG_DIR=/tmp/logs
WORKDIR /app

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node docs ./docs
COPY --chown=node:node scripts ./scripts

# Контейнер работает без root; каталог журналов доступен для записи.
RUN mkdir -p /tmp/logs && chown node:node /tmp/logs
USER node

EXPOSE 10000

# Liveness: процесс отвечает по HTTP. Готовность БД проверяет GET /health/ready.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||10000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
