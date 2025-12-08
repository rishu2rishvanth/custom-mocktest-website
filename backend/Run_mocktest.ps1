
# Move into backend
Set-Location "D:\Coding-Experimental\custom-mocktest-website\backend"

# Activate venv
& .\venv\Scripts\Activate.ps1

# Kill old pythonw
taskkill /im pythonw.exe /F 2>$null

# Run prevent_sleep.py silently (no console window)
Start-Process -WindowStyle Hidden pythonw.exe "prevent_sleep.py"

# Deactivate venv
deactivate

# Set PORT for this process
$env:PORT = "5000"

# Start npm silently
Start-Process "cmd.exe" "/c npm start" -WindowStyle Hidden

