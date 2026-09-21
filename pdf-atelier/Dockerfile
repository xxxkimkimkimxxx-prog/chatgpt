# Protective static release: no document dependencies or engine.
FROM python:3.13-slim
WORKDIR /app
COPY server.py ./server.py
COPY index.html ./dist/client/index.html
COPY public/privacy.css ./dist/client/privacy.css
ENV PORT=10000
EXPOSE 10000
USER 65534:65534
CMD ["python3", "server.py"]
