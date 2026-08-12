FROM python:3.12-slim

WORKDIR /app

# Evita archivos .pyc y mejora los logs
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Limita a 1 la cantidad de "arenas" de memoria que crea glibc. Por defecto glibc puede
# crear varias arenas (hasta 8x los cores) y cada una retiene su propio pool de memoria
# sin devolverlo al SO; en un contenedor de 512MB con un solo worker eso desperdicia RAM
# que nunca se libera. Con 1 arena, todo el heap pasa por el mismo pool y malloc_trim()
# lo puede devolver al SO de forma más efectiva.
ENV MALLOC_ARENA_MAX=1

# Instalar dependencias
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código
COPY backend/ .

# Railway inyecta la variable PORT automáticamente
CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]