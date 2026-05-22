"""
Portly Pi Server
─────────────────
HTTP  :3000  — GET  /status
              POST /open-door
              GET  /audio-stream  (microfone Pi → telemóvel, MP3 via ffmpeg)

WS    :3001  — wire protocol com o app:
  App → Pi  {"type":"command","action":"answer-call"|"end-call"|"open-lock"}
            {"type":"audio-chunk","data":"<base64 m4a>"}   (PTT)
            {"type":"register-expo-token","token":"..."}
  Pi → App  {"type":"video-frame","data":"<base64 jpeg>"}
            {"type":"event","name":"doorbell-pressed"|"lock-opened"|"lock-closed"|
                             "device-online"|"call-started"|"call-ended",
             "timestamp":<unix>}

GPIO (BCM numbering):
  DOOR_RELAY_PIN = 17  — relé da fechadura  (active-low, ajusta se necessário)
  BELL_PIN       = 27  — botão da campainha (pull-up interno)
"""

from __future__ import annotations

import asyncio
import base64
import io
import json
import subprocess
import tempfile
import threading
import time

import uvicorn
import websockets
import websockets.exceptions
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

# ── Config ─────────────────────────────────────────────────────────────────────
HTTP_PORT      = 3000
WS_PORT        = 3001
DOOR_RELAY_PIN = 17   # GPIO BCM do relé (ajusta ao teu circuito)
BELL_PIN       = 27   # GPIO BCM do botão da campainha
DOOR_OPEN_SECS = 3    # segundos que o relé fica activo
VIDEO_FPS      = 15

# ── Câmara ─────────────────────────────────────────────────────────────────────
try:
    from picamera2 import Picamera2
    _cam = Picamera2()
    _cam.configure(
        _cam.create_video_configuration(main={"size": (640, 480), "format": "RGB888"})
    )
    _cam.start()
    CAMERA_OK = True
    print(f"✓ Câmara iniciada (640×480 @ {VIDEO_FPS} fps)")
except Exception as _e:
    _cam = None
    CAMERA_OK = False
    print(f"✗ Câmara não disponível: {_e}")

# ── GPIO ────────────────────────────────────────────────────────────────────────
try:
    from gpiozero import Button, OutputDevice
    _relay = OutputDevice(DOOR_RELAY_PIN, active_high=False, initial_value=False)
    _bell  = Button(BELL_PIN, pull_up=True, bounce_time=0.1)
    GPIO_OK = True
    print(f"✓ GPIO: relay=BCM{DOOR_RELAY_PIN}  campainha=BCM{BELL_PIN}")
except Exception as _e:
    _relay = _bell = None
    GPIO_OK = False
    print(f"✗ GPIO não disponível: {_e}")

# ── WebSocket clients ───────────────────────────────────────────────────────────
_clients: set = set()   # websockets.ServerConnection


async def _broadcast(msg: dict) -> None:
    if not _clients:
        return
    data = json.dumps(msg)
    await asyncio.gather(*[c.send(data) for c in list(_clients)], return_exceptions=True)


# ── Vídeo streaming ─────────────────────────────────────────────────────────────
_streaming = False
_stream_task: asyncio.Task | None = None


async def _video_loop() -> None:
    while _streaming and CAMERA_OK and _cam:
        try:
            buf = io.BytesIO()
            _cam.capture_file(buf, format="jpeg")
            b64 = base64.b64encode(buf.getvalue()).decode()
            await _broadcast({"type": "video-frame", "data": b64})
        except Exception:
            pass
        await asyncio.sleep(1 / VIDEO_FPS)


# ── Porta / relé ────────────────────────────────────────────────────────────────
def _pulse_relay() -> None:
    if GPIO_OK and _relay:
        _relay.on()
        time.sleep(DOOR_OPEN_SECS)
        _relay.off()


# ── Campainha (GPIO → WebSocket) ────────────────────────────────────────────────
def _setup_bell(loop: asyncio.AbstractEventLoop) -> None:
    if not GPIO_OK or _bell is None:
        return

    def _on_press():
        asyncio.run_coroutine_threadsafe(
            _broadcast({"type": "event", "name": "doorbell-pressed", "timestamp": time.time()}),
            loop,
        )

    _bell.when_pressed = _on_press


# ── Áudio Pi → telemóvel (ffmpeg, streaming MP3) ───────────────────────────────
def _mic_generator():
    """Capta do microfone ALSA e converte para MP3 em tempo real."""
    cmd = [
        "ffmpeg", "-loglevel", "quiet",
        "-f", "alsa", "-i", "default",
        "-ar", "16000", "-ac", "1",
        "-f", "mp3", "pipe:1",
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    try:
        while True:
            chunk = proc.stdout.read(4096)
            if not chunk:
                break
            yield chunk
    finally:
        proc.kill()


# ── Áudio telemóvel → Pi (PTT, M4A chunks) ─────────────────────────────────────
def _play_ptt(b64: str) -> None:
    """Recebe um clip M4A em base64 e toca no altifalante do Pi."""
    try:
        data = base64.b64decode(b64)
        with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as f:
            f.write(data)
            fname = f.name
        subprocess.run(
            ["ffmpeg", "-loglevel", "quiet", "-i", fname, "-f", "alsa", "default"],
            check=False,
        )
        import os; os.unlink(fname)
    except Exception as e:
        print(f"[ptt] erro: {e}")


# ── FastAPI — HTTP :3000 ────────────────────────────────────────────────────────
http_app = FastAPI(title="Portly Pi Server")
http_app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


@http_app.get("/status")
def route_status():
    return {
        "online": True,
        "camera": CAMERA_OK,
        "gpio": GPIO_OK,
        "streaming": _streaming,
        "clients": len(_clients),
        "timestamp": time.time(),
    }


@http_app.post("/open-door")
def route_open_door():
    if not GPIO_OK or _relay is None:
        return JSONResponse({"success": False, "message": "GPIO não disponível"}, status_code=503)
    threading.Thread(target=_pulse_relay, daemon=True).start()
    return {"success": True, "message": f"Porta aberta ({DOOR_OPEN_SECS}s)"}


@http_app.get("/audio-stream")
def route_audio_stream():
    return StreamingResponse(_mic_generator(), media_type="audio/mpeg")


# ── WebSocket handler — WS :3001 ────────────────────────────────────────────────
async def _ws_handler(ws) -> None:
    global _streaming, _stream_task
    _clients.add(ws)
    print(f"[ws] ligado — clientes: {len(_clients)}")

    await _broadcast({"type": "event", "name": "device-online", "timestamp": time.time()})

    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except Exception:
                continue

            t = msg.get("type")

            if t == "command":
                action = msg.get("action")

                if action == "answer-call":
                    _streaming = True
                    if _stream_task is None or _stream_task.done():
                        _stream_task = asyncio.create_task(_video_loop())
                    await _broadcast({"type": "event", "name": "call-started", "timestamp": time.time()})

                elif action == "end-call":
                    _streaming = False
                    await _broadcast({"type": "event", "name": "call-ended", "timestamp": time.time()})

                elif action == "open-lock":
                    threading.Thread(target=_pulse_relay, daemon=True).start()
                    await _broadcast({"type": "event", "name": "lock-opened", "timestamp": time.time()})

                    async def _emit_closed():
                        await asyncio.sleep(DOOR_OPEN_SECS)
                        await _broadcast({"type": "event", "name": "lock-closed", "timestamp": time.time()})

                    asyncio.create_task(_emit_closed())

            elif t == "audio-chunk":
                threading.Thread(target=_play_ptt, args=(msg.get("data", ""),), daemon=True).start()

            elif t == "register-expo-token":
                print(f"[ws] token: {str(msg.get('token',''))[:24]}…")

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        _clients.discard(ws)
        if not _clients:
            _streaming = False
        print(f"[ws] desligado — clientes: {len(_clients)}")


# ── Arranque ────────────────────────────────────────────────────────────────────
async def main() -> None:
    loop = asyncio.get_running_loop()
    _setup_bell(loop)

    ws_server = await websockets.serve(_ws_handler, "0.0.0.0", WS_PORT)
    print(f"✓ WebSocket  ws://0.0.0.0:{WS_PORT}")

    http_cfg = uvicorn.Config(http_app, host="0.0.0.0", port=HTTP_PORT, log_level="warning")
    http_srv = uvicorn.Server(http_cfg)
    print(f"✓ HTTP API   http://0.0.0.0:{HTTP_PORT}")
    print("Portly Pi Server a correr — Ctrl+C para parar\n")

    await asyncio.gather(ws_server.wait_closed(), http_srv.serve())


if __name__ == "__main__":
    asyncio.run(main())
