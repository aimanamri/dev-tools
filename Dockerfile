# syntax=docker/dockerfile:1

# ── Stage 1: build the static site ───────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /src/app

# Install dependencies first, so Docker can cache this layer.
COPY app/package.json app/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY app/ ./
RUN npm run build

# ── Stage 2: serve with nginx as a non-root user ─────────────────────────────
FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime

ARG VERSION=dev
LABEL org.opencontainers.image.title="Dev Tools" \
      org.opencontainers.image.description="Developer tools that run in your browser" \
      org.opencontainers.image.source="https://github.com/aimanamri/dev-tools" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="${VERSION}"

# The files belong to root. The nginx user (uid 101) can read them but cannot change them.
USER root
COPY --chown=root:root nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=root:root nginx-security-headers.inc /etc/nginx/conf.d/security-headers.inc
COPY --from=build --chown=root:root /src/app/dist /usr/share/nginx/html
# .htaccess is for Apache hosts only.
RUN rm -f /usr/share/nginx/html/.htaccess
USER 101

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
