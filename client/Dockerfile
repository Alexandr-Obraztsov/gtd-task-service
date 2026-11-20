# --- Стадия 1: сборка статики Vite
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
# Адрес API и DSN GlitchTip вшиваются в сборку (переменные Vite читаются при build)
ARG VITE_API_URL=
ARG VITE_SENTRY_DSN=
ARG VITE_APP_VERSION=
ENV VITE_API_URL=$VITE_API_URL VITE_SENTRY_DSN=$VITE_SENTRY_DSN VITE_APP_VERSION=$VITE_APP_VERSION
RUN npm run build

# --- Стадия 2: отдача статики через nginx
FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
