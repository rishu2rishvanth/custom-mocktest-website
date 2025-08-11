.\venv\Scripts\Activate
tasklist | findstr pythonw.exe
taskkill /im pythonw.exe /F
pythonw prevent_sleep.py
deactivate
set PORT=3000 && npm start