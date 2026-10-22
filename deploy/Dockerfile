FROM node:22-bookworm-slim AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV BACKEND_URL=http://127.0.0.1:8000 \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM python:3.13-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    BACKEND_URL=http://127.0.0.1:8000 \
    DATABASE_URL=sqlite:////app/data/shiftos.db \
    PORT=10000
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libstdc++6 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 shiftos \
    && mkdir -p /app/data \
    && chown shiftos:shiftos /app/data
COPY --from=frontend-build /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
COPY --chown=shiftos:shiftos backend/app/ /app/backend/app/
COPY --chown=shiftos:shiftos datasets/seed/catalog.json /app/datasets/seed/catalog.json
COPY --from=frontend-build --chown=shiftos:shiftos /build/frontend/node_modules /app/frontend/node_modules
COPY --from=frontend-build --chown=shiftos:shiftos /build/frontend/.next /app/frontend/.next
COPY --from=frontend-build --chown=shiftos:shiftos /build/frontend/package.json /app/frontend/package.json
COPY --from=frontend-build --chown=shiftos:shiftos /build/frontend/next.config.ts /app/frontend/next.config.ts
COPY --chown=shiftos:shiftos deploy/start.py /app/deploy/start.py
USER shiftos
EXPOSE 10000
CMD ["python", "/app/deploy/start.py"]
