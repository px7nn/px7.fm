import  os, sys
import  requests

from    socket      import create_connection
from    time        import time, sleep
from    subprocess  import Popen
from    threading   import Thread
from    app         import app, HOST, PORT

def base_path():
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.abspath('.')

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
    neutralino_exe = os.path.join(base_path(), 'neutralino', 'bin', 'neutralino-win_x64.exe')
    cwd = os.path.join(base_path(), 'neutralino')
    frontend = Popen([neutralino_exe, '--load-dir-res', '--path=.'], cwd=cwd)

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