cd .\backend
.\venv\Scripts\Activate
tasklist | findstr pythonw.exe
taskkill /im pythonw.exe /F
pythonw prevent_sleep.py
deactivate
npm start