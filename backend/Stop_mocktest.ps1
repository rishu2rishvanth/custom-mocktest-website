
# Move into backend
Set-Location "D:\Coding-Experimental\custom-mocktest-website\backend"

# Activate venv (if needed for path cleanup)
& .\venv\Scripts\Activate.ps1

# Show currently running pythonw processes
tasklist | findstr pythonw.exe

# Kill pythonw (prevent_sleep.py)
taskkill /im pythonw.exe /F 2>$null

# Kill node (npm start)
taskkill /im node.exe /F 2>$null

# Optional: Kill cmd.exe if npm started a child cmd
taskkill /im cmd.exe /F 2>$null

# Deactivate environment
deactivate
