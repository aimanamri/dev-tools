# Stage 1: build
FROM node:20-alpine AS builder

WORKDIR /app

COPY app/package.json app/package-lock.json ./
RUN npm ci --prefer-offline

COPY app/ .
RUN npm run build

# Stage 2: serve
FROM nginx:alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
