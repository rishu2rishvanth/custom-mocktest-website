import ctypes
import time

# Define the Windows API functions and constants
ES_CONTINUOUS = 0x80000000
ES_SYSTEM_REQUIRED = 0x00000001
ES_DISPLAY_REQUIRED = 0x00000002

def prevent_sleep():
    ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED)

try:
    while True:
        prevent_sleep()
        time.sleep(60)  # Check every minute
except KeyboardInterrupt:
    print("Exiting...")

