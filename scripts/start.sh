#!/bin/bash
# Levanta backend (FastAPI) y frontend (React) juntos

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Iniciando Backend (FastAPI en :8000)..."
cd "$ROOT_DIR/backend"
uvicorn server:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "==> Iniciando Frontend (React en :3000)..."
cd "$ROOT_DIR/frontend"
yarn start &
FRONTEND_PID=$!

echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Presiona Ctrl+C para detener ambos servicios."

# Al presionar Ctrl+C, matar ambos procesos
trap "echo ''; echo 'Deteniendo servicios...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
