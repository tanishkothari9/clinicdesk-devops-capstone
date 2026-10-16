# syntax=docker/dockerfile:1

# ---- Stage 1: build the static bundle ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
ARG APP_VERSION=dev
ENV VITE_APP_VERSION=${APP_VERSION}
RUN npm run build

# ---- Stage 2: serve with unprivileged nginx (uid 101, port 8080) ----
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

ARG APP_VERSION=dev
LABEL org.opencontainers.image.title="clinicdesk-frontend" \
      org.opencontainers.image.description="ClinicDesk web UI served by nginx" \
      org.opencontainers.image.version="${APP_VERSION}"

# The image's entrypoint renders /etc/nginx/templates/*.template with envsubst at startup.
# NGINX_ENVSUBST_FILTER limits substitution to BACKEND_URL so nginx variables ($host, $uri, ...) are untouched.
ENV BACKEND_URL=http://backend:8000 \
    NGINX_ENVSUBST_FILTER=BACKEND_URL

# The upstream image lags behind Alpine security releases (curl, openssl, expat, pcre2...
# flagged HIGH by Trivy), so upgrade OS packages, and drop curl which nothing here uses.
USER root
RUN apk upgrade --no-cache && apk del --no-cache curl

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/nginx-health || exit 1

USER 101
