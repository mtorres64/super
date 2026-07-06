FROM python:3.12-slim

WORKDIR /app

# Evita archivos .pyc y mejora los logs
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Instalar dependencias
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código
COPY . .

# Railway inyecta la variable PORT automáticamente
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}