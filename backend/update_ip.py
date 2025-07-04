import re
import socket
import os

# Step 1: Get the current IP address of the machine
def get_current_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.254.254.254', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

# Step 2: Update script.js with the new IP address
def update_ip_in_script(file_path, new_ip):
    if not os.path.isfile(file_path):
        print(f"⚠ File not found: {file_path}")
        return

    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()

        updated = re.sub(
            r"http://\d{1,3}(?:\.\d{1,3}){3}:5000",
            f"http://{new_ip}:5000",
            content
        )

        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(updated)

        # print(f"\033[92m✔ IP updated in {os.path.basename(file_path)} to http://{new_ip}:5000\033[0m")
    except Exception as e:
        print(f"❌ Error updating {file_path}: {e}")

current_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dir = os.path.join(current_dir, 'frontend')

files_to_update = ['script.js', 'resultManager.js']
current_ip = get_current_ip()

for filename in files_to_update:
    update_ip_in_script(os.path.join(frontend_dir, filename), current_ip)

print(f"\033[92m✔ Server running on http://{current_ip}:5000\033[0m")
