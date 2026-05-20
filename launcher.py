import  os, sys
import  requests

from    platform    import system
from    socket      import create_connection
from    time        import time, sleep
from    subprocess  import Popen
from    threading   import Thread
from    app         import app, HOST, PORT

def base_path():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.abspath('.')


def get_neutralino_binary():
    os_name = system().lower()

    if os_name == "windows":
        return "neutralino-win_x64.exe"

    elif os_name == "linux":
        return "neutralino-linux_x64"

    elif os_name == "darwin":
        return "neutralino-mac_universal"

    raise RuntimeError(f"Unsupported OS: {os_name}")


def run_flask():
    app.run(host=HOST, port=PORT, debug=False, use_reloader=False)


def flask_is_alive() -> bool:
    try:
        res = requests.head(f'http://{HOST}:{PORT}/api/health', timeout=4)
        return res.ok
    except Exception:
        return False


def wait_for_server(timeout = 10):
    start = time()

    while time() - start < timeout:
        try:
            with create_connection((HOST, PORT), timeout=1):
                return True
        except Exception:
            sleep(0.2)
    return False


def launch_frontend():
    neutralino = os.path.join(base_path(), '_internal', 'neutralino', 'bin', get_neutralino_binary())
    
    if system().lower() != "windows":
        os.chmod(neutralino, 0o755)

    cwd = os.path.join(base_path(), '_internal', 'neutralino')
    frontend = Popen([neutralino, '--path=.'], cwd=cwd)

    frontend.wait()


def main():
    if flask_is_alive(): 
        launch_frontend()
        return
    
    flask_thread = Thread(target=run_flask, daemon=True)
    flask_thread.start()

    if not wait_for_server():
        sys.exit("Failed to start backend")
    
    launch_frontend()
    

if __name__ == "__main__":
    main()