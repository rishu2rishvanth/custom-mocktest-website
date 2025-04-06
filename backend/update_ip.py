import re
import socket
import os

# Step 1: Get the current IP address of the machine
def get_current_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # This doesn't actually send any data, it just determines the IP address to use
        s.connect(('10.254.254.254', 1))  # Connect to an arbitrary address
        ip = s.getsockname()[0]
    except Exception as e:
        print(f"Error getting IP address: {e}")
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

# Step 2: Update script.js with the new IP address
def update_ip_in_script(file_path, new_ip):
    if not os.path.isfile(file_path):
        print(f"File not found: {file_path}")
        return

    try:
        with open(file_path, 'r') as file:
            script_content = file.read()

        # Replace the old IP address with the new one (assumes IP is in a specific format like '192.168.1.1')
        # Note: This regex pattern will replace all IP addresses in the format 'xxx.xxx.xxx.xxx'
        updated_content = re.sub(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', new_ip, script_content)

        with open(file_path, 'w') as file:
            file.write(updated_content)

        # print(f"Updated IP address in {file_path} to {new_ip}")
        print(f"Server running on http://{new_ip}:5000")
    except IOError as e:
        print(f"Error reading/writing file: {e}")

# ✅ Use current script directory and join relative path
current_dir = os.path.dirname(os.path.abspath(__file__))
script_js_path = os.path.join(current_dir, 'backend', 'frontend', 'script.js')

# Fetch the current IP address
current_ip = get_current_ip()

# Update the IP address in script.js
update_ip_in_script(script_js_path, current_ip)
