@echo off
cd /d "%~dp0\..\backend"
"C:\Users\marcelo.torres\AppData\Local\Programs\Python\Python313\python.exe" -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
