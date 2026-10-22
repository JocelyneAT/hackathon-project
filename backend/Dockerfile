FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend \
    DATABASE_URL=sqlite:////data/shiftos.db

WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt \
    && useradd --create-home --uid 10001 shiftos \
    && mkdir -p /data \
    && chown shiftos:shiftos /data
COPY --chown=shiftos:shiftos backend /app/backend
COPY --chown=shiftos:shiftos datasets /app/datasets
USER shiftos
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
