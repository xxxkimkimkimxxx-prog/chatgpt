# Browser-local release: build assets, then ship only static files and a rejecting server.
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY index.html vite.config.mjs ./
COPY src ./src
COPY assets ./assets
COPY public ./public
COPY scripts/prepare-web-assets.mjs ./scripts/prepare-web-assets.mjs
RUN npm run build:web

FROM python:3.13-slim
WORKDIR /app
COPY server.py ./server.py
COPY --from=builder /app/dist/client ./dist/client
ENV PORT=10000
EXPOSE 10000
USER 65534:65534
CMD ["python3", "server.py"]
