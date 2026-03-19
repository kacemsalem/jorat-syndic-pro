FROM python:3.12-slim

WORKDIR /app

# Dépendances système pour psycopg2 et pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .

# Collecte des fichiers statiques au build
RUN DJANGO_SETTINGS_MODULE=config.settings_prod \
    DJANGO_SECRET_KEY=build-placeholder \
    DB_PASSWORD=build-placeholder \
    python manage.py collectstatic --noinput || true

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
