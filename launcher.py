import subprocess
import threading
import time
import os
import sys
import signal
import queue
import tkinter as tk
from tkinter.scrolledtext import ScrolledText

# =========================
# CONFIGURATION SECTION
# =========================

# Update these paths if you move your frontend/backend folders
FRONTEND_PATH = os.path.abspath("./client")
BACKEND_PATH = os.path.abspath("./server")

# Cloudflared tunnel name and public URL
CLOUDFLARED_TUNNEL_NAME = "backend-tunnel"
CLOUDFLARED_PUBLIC_URL = "https://backend.hotel.com"
CLOUDFLARED_PORT = 5000

# Ngrok reserved domain and port
NGROK_DOMAIN = "yourhotelmenu.ngrok.io"
NGROK_PORT = 3000

# Retry settings
RETRY_INTERVAL = 5  # seconds between retries
MAX_RETRIES = 5     # max retries for each service

# =========================
# END CONFIGURATION
# =========================

# Helper to find the right shell for subprocess
SHELL = True if os.name == "nt" else False

# For process management
processes = {}
log_queue = queue.Queue()

def log(msg):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    log_queue.put(f"[{timestamp}] {msg}")

def run_process(name, cmd, cwd=None, env=None, ready_check=None, retries=MAX_RETRIES):
    """
    Start a subprocess, retry if it fails, and check readiness.
    """
    attempt = 0
    while attempt < retries:
        try:
            log(f"Starting {name} (attempt {attempt+1}/{retries})...")
            proc = subprocess.Popen(
                cmd,
                cwd=cwd,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                shell=SHELL,
                text=True,
                bufsize=1
            )
            processes[name] = proc

            # Wait for readiness if a check is provided
            if ready_check:
                for _ in range(60):  # up to 60 seconds
                    if ready_check():
                        log(f"{name} is ready.")
                        break
                    if proc.poll() is not None:
                        raise Exception(f"{name} exited unexpectedly.")
                    time.sleep(1)
                else:
                    raise Exception(f"{name} did not become ready in time.")
            else:
                time.sleep(2)  # Give it a moment to start

            # Start a thread to read logs
            threading.Thread(target=stream_logs, args=(name, proc), daemon=True).start()
            return proc
        except Exception as e:
            log(f"Error starting {name}: {e}")
            attempt += 1
            time.sleep(RETRY_INTERVAL)
    log(f"Failed to start {name} after {retries} attempts.")
    return None

def stream_logs(name, proc):
    try:
        for line in proc.stdout:
            log(f"[{name}] {line.rstrip()}")
    except Exception as e:
        log(f"[{name}] Log stream error: {e}")

def check_port_open(port):
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def start_frontend():
    return run_process(
        "Frontend",
        "npm start",
        cwd=FRONTEND_PATH,
        ready_check=lambda: check_port_open(NGROK_PORT)
    )

def start_backend():
    return run_process(
        "Backend",
        "npm start",
        cwd=BACKEND_PATH,
        ready_check=lambda: check_port_open(CLOUDFLARED_PORT)
    )

def start_cloudflared():
    # Assumes tunnel is already configured and named
    cmd = f'cloudflared tunnel run {CLOUDFLARED_TUNNEL_NAME}'
    return run_process(
        "Cloudflared",
        cmd,
        ready_check=lambda: check_port_open(CLOUDFLARED_PORT)
    )

def start_ngrok():
    # Assumes ngrok is authed and reserved domain is set up
    cmd = f'ngrok http {NGROK_PORT} --domain={NGROK_DOMAIN}'
    return run_process(
        "Ngrok",
        cmd,
        ready_check=lambda: check_port_open(NGROK_PORT)
    )

def stop_all_processes():
    for name, proc in processes.items():
        if proc and proc.poll() is None:
            log(f"Terminating {name}...")
            try:
                if os.name == "nt":
                    proc.send_signal(signal.CTRL_BREAK_EVENT)
                else:
                    proc.terminate()
                proc.wait(timeout=10)
            except Exception as e:
                log(f"Error terminating {name}: {e}")

def on_close():
    stop_all_processes()
    root.destroy()
    sys.exit(0)

def gui_loop():
    root.protocol("WM_DELETE_WINDOW", on_close)
    def poll_log():
        while not log_queue.empty():
            txt = log_queue.get_nowait()
            log_widget.insert(tk.END, txt + "\n")
            log_widget.see(tk.END)
        root.after(200, poll_log)
    poll_log()
    root.mainloop()

def main():
    log("Launcher started.")
    # Start backend first (needed for cloudflared)
    backend_proc = start_backend()
    if not backend_proc:
        log("Backend failed to start. Exiting.")
        return

    # Start frontend
    frontend_proc = start_frontend()
    if not frontend_proc:
        log("Frontend failed to start. Exiting.")
        return

    # Start cloudflared tunnel
    cloudflared_proc = start_cloudflared()
    if not cloudflared_proc:
        log("Cloudflared tunnel failed to start. Exiting.")
        return

    # Start ngrok tunnel
    ngrok_proc = start_ngrok()
    if not ngrok_proc:
        log("Ngrok tunnel failed to start. Exiting.")
        return

    log("All services started successfully.")
    log(f"Backend public URL: {CLOUDFLARED_PUBLIC_URL}")
    log(f"Frontend public URL: https://{NGROK_DOMAIN}")

    # Wait for all processes
    while True:
        time.sleep(1)
        for name, proc in processes.items():
            if proc and proc.poll() is not None:
                log(f"{name} exited unexpectedly. Attempting restart...")
                # Restart the failed process
                if name == "Frontend":
                    processes[name] = start_frontend()
                elif name == "Backend":
                    processes[name] = start_backend()
                elif name == "Cloudflared":
                    processes[name] = start_cloudflared()
                elif name == "Ngrok":
                    processes[name] = start_ngrok()

# =========================
# GUI SETUP (tkinter)
# =========================
root = tk.Tk()
root.title("QR Ordering Launcher")
root.geometry("800x500")
log_widget = ScrolledText(root, state="normal", height=30, width=100, font=("Consolas", 10))
log_widget.pack(padx=10, pady=10, fill=tk.BOTH, expand=True)

# Start main logic in a thread so GUI remains responsive
threading.Thread(target=main, daemon=True).start()
gui_loop()

# =========================
# END OF SCRIPT
# =========================

"""
=========================
INSTRUCTIONS & COMMENTS
=========================

1. To convert this script to a Windows .exe:
   - Install PyInstaller: pip install pyinstaller
   - Run: pyinstaller --onefile --noconsole launcher.py
   - The .exe will be in the 'dist' folder.

2. Cloudflared and Ngrok:
   - Ensure 'cloudflared' and 'ngrok' are in your system PATH.
   - Cloudflared: Tunnel must be created and named (see https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/)
   - Ngrok: Authtoken and reserved domain must be set up (see https://ngrok.com/docs)

3. Config files:
   - Cloudflared config: Usually in %USERPROFILE%\.cloudflared\
   - Ngrok config: Usually in %USERPROFILE%\.ngrok\ or %USERPROFILE%\.ngrok2\

4. If you move your frontend/backend folders, update FRONTEND_PATH and BACKEND_PATH at the top of this script.

5. This script is robust: it retries failed services, shows logs, and can be closed safely.

6. No QR code generation is included, as requested.

7. If you do not want a GUI, you can remove the tkinter section and call main() directly.

""" 