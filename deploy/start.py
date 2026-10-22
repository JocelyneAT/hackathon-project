"""Run the web frontend and one internal API process in a single container."""

from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

APP_ROOT = Path(__file__).resolve().parents[1]
BACKEND_PORT = 8000
STARTUP_TIMEOUT = 90
SHUTDOWN_TIMEOUT = 10


def signal_child(child: subprocess.Popen, signum: int) -> None:
    if child.poll() is not None:
        return
    try:
        if os.name == "posix":
            os.killpg(child.pid, signum)
        elif signum == signal.SIGTERM:
            child.terminate()
        else:
            child.kill()
    except ProcessLookupError:
        pass


def stop_children(children: list[subprocess.Popen]) -> None:
    for child in reversed(children):
        signal_child(child, signal.SIGTERM)
    deadline = time.monotonic() + SHUTDOWN_TIMEOUT
    for child in reversed(children):
        try:
            child.wait(timeout=max(0, deadline - time.monotonic()))
        except subprocess.TimeoutExpired:
            signal_child(
                child, signal.SIGKILL if os.name == "posix" else signal.SIGTERM
            )
            if os.name != "posix" and child.poll() is None:
                child.kill()
            child.wait(timeout=2)


def backend_ready() -> bool:
    try:
        with urlopen(f"http://127.0.0.1:{BACKEND_PORT}/health", timeout=1) as response:
            status = json.load(response)
            return (
                status.get("status") == "healthy"
                and status.get("database", {}).get("status") == "connected"
            )
    except (HTTPError, URLError, TimeoutError, ValueError, OSError):
        return False


def main() -> int:
    try:
        public_port = int(os.getenv("PORT", "10000"))
    except ValueError:
        print("PORT must be an integer.", file=sys.stderr, flush=True)
        return 1
    if not 1 <= public_port <= 65535 or public_port == BACKEND_PORT:
        print(
            "PORT must be between 1 and 65535 and must differ from internal port 8000.",
            file=sys.stderr,
            flush=True,
        )
        return 1

    stopping = threading.Event()

    def request_shutdown(signum: int, _frame) -> None:
        print(f"Received signal {signum}; stopping both services.", flush=True)
        stopping.set()

    signal.signal(signal.SIGTERM, request_shutdown)
    signal.signal(signal.SIGINT, request_shutdown)
    children: list[subprocess.Popen] = []
    try:
        backend = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--app-dir",
                str(APP_ROOT / "backend"),
                "--host",
                "127.0.0.1",
                "--port",
                str(BACKEND_PORT),
                "--workers",
                "1",
            ],
            cwd=APP_ROOT,
            start_new_session=os.name == "posix",
        )
        children.append(backend)
        deadline = time.monotonic() + STARTUP_TIMEOUT
        while not stopping.is_set():
            if backend.poll() is not None:
                print(
                    "The API stopped before becoming ready.",
                    file=sys.stderr,
                    flush=True,
                )
                return 1
            if backend_ready():
                break
            if time.monotonic() >= deadline:
                print(
                    "The API did not become healthy within 90 seconds.",
                    file=sys.stderr,
                    flush=True,
                )
                return 1
            stopping.wait(0.25)
        if stopping.is_set():
            return 0

        frontend_env = dict(os.environ)
        frontend_env["BACKEND_URL"] = "http://127.0.0.1:8000"
        frontend = subprocess.Popen(
            [
                "node",
                str(
                    APP_ROOT
                    / "frontend"
                    / "node_modules"
                    / "next"
                    / "dist"
                    / "bin"
                    / "next"
                ),
                "start",
                "--hostname",
                "0.0.0.0",
                "--port",
                str(public_port),
            ],
            cwd=APP_ROOT / "frontend",
            env=frontend_env,
            start_new_session=os.name == "posix",
        )
        children.append(frontend)
        print(
            f"Frontend listening on port {public_port}; API available internally on port 8000.",
            flush=True,
        )
        while not stopping.wait(0.25):
            for name, child in (("API", backend), ("frontend", frontend)):
                if child.poll() is not None:
                    print(
                        f"The {name} stopped unexpectedly; shutting down the container.",
                        file=sys.stderr,
                        flush=True,
                    )
                    return 1
        return 0
    except OSError as exc:
        print(f"Could not start the application: {exc}", file=sys.stderr, flush=True)
        return 1
    finally:
        stop_children(children)


if __name__ == "__main__":
    raise SystemExit(main())
