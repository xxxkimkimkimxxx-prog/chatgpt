FROM python:3.13-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends nodejs npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt package.json package-lock.json ./
RUN pip install --no-cache-dir -r requirements.txt \
    && npm ci

COPY . .
RUN npm run build:render

ENV PORT=10000
EXPOSE 10000
CMD ["python3", "server.py"]
