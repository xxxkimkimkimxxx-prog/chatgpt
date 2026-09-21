FROM python:3.13-slim AS builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends nodejs npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt package.json package-lock.json ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt \
    && npm ci

COPY . .
RUN npm run build:render

FROM python:3.13-slim
WORKDIR /app
COPY --from=builder /install /usr/local
COPY --from=builder /app/server.py /app/engine.py /app/engine_cli.py ./
COPY --from=builder /app/assets/fonts ./assets/fonts
COPY --from=builder /app/dist/client ./dist/client

ENV PORT=10000
EXPOSE 10000
CMD ["python3", "server.py"]
