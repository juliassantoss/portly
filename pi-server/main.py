"""
Portly Pi Server  —  webcam USB + microfone da webcam, sem GPIO
─────────────────────────────────────────────────────────────────
HTTP  :3000  — GET  /status
              POST /open-door   (stub — sem relé)
              GET  /audio-stream  (mic da webcam → telemóvel, MP3)

WS    :3001  — wire protocol com o app:
  App → Pi  {"type":"command","action":"answer-call"|"end-call"|"open-lock"}
            {"type":"audio-chunk","data":"<base64 m4a>"}   (PTT)
            {"type":"register-expo-token","token":"..."}
  Pi → App  {"type":"video-frame","data":"<base64 jpeg>"}
            {"type":"event","name":"doorbell-pressed"|"lock-opened"|...}
"""

from __future__ import annotations

import asyncio
import base64
import json
import subprocess
import tempfile
import threading
import time

import cv2
import uvicorn
import websockets
import websockets.exceptions
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

# ── Config ─────────────────────────────────────────────────────────────────────
HTTP_PORT   = 3000
WS_PORT     = 3001
VIDEO_FPS   = 15
VIDEO_INDEX = 0   # /dev/video0 — muda para 1, 2... se a webcam não for a primeira

# ── Câmara (webcam USB via OpenCV) ─────────────────────────────────────────────
_cap = cv2.VideoCapture(VIDEO_INDEX)
if _cap.isOpened():
    _cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    _cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    _cap.set(cv2.CAP_PROP_FPS, VIDEO_FPS)
    CAMERA_OK = True
    print(f"✓ Webcam aberta (/dev/video{VIDEO_INDEX})")
else:
    CAMERA_OK = False
    print(f"✗ Webcam não encontrada em /dev/video{VIDEO_INDEX}")

_cap_lock = threading.Lock()


def _capture_jpeg() -> bytes | None:
    with _cap_lock:
        ret, frame = _cap.read()
    if not ret:
        return None
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
    return buf.tobytes() if ok else None


# ── WebSocket clients ───────────────────────────────────────────────────────────
_clients: set = set()


async def _broadcast(msg: dict) -> None:
    if not _clients:
        return
    data = json.dumps(msg)
    await asyncio.gather(*[c.send(data) for c in list(_clients)], return_exceptions=True)


# ── Vídeo streaming ─────────────────────────────────────────────────────────────
_streaming = False
_stream_task: asyncio.Task | None = None


async def _video_loop() -> None:
    while _streaming and CAMERA_OK:
        frame = await asyncio.get_event_loop().run_in_executor(None, _capture_jpeg)
        if frame:
            b64 = base64.b64encode(frame).decode()
            await _broadcast({"type": "video-frame", "data": b64})
        await asyncio.sleep(1 / VIDEO_FPS)


# ── Áudio Pi → telemóvel (mic da webcam via ffmpeg) ────────────────────────────
def _mic_generator():
    """
    Capta áudio da webcam (ALSA) e envia como MP3 em streaming.
    Se o mic da webcam não for 'default', descobre o dispositivo com:
        arecord -l
    e muda "-i default" para "-i plughw:CARD,DEV"
    """
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


# ── PTT: telemóvel → altifalante do Pi ─────────────────────────────────────────
def _play_ptt(b64: str) -> None:
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
        "gpio": False,
        "streaming": _streaming,
        "clients": len(_clients),
        "timestamp": time.time(),
    }


@http_app.post("/open-door")
def route_open_door():
    # Sem relé — devolve sucesso para o app não mostrar erro.
    # Liga aqui o teu actuador quando tiveres hardware.
    return {"success": True, "message": "Comando recebido (sem relé ligado)"}


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

            t      = msg.get("type")
            action = msg.get("action")

            if t == "command":
                if action == "answer-call":
                    _streaming = True
                    if _stream_task is None or _stream_task.done():
                        _stream_task = asyncio.create_task(_video_loop())
                    await _broadcast({"type": "event", "name": "call-started", "timestamp": time.time()})

                elif action == "end-call":
                    _streaming = False
                    await _broadcast({"type": "event", "name": "call-ended", "timestamp": time.time()})

                elif action == "open-lock":
                    # Sem relé — emite os eventos para o app actualizar a UI
                    await _broadcast({"type": "event", "name": "lock-opened", "timestamp": time.time()})

                    async def _emit_closed():
                        await asyncio.sleep(3)
                        await _broadcast({"type": "event", "name": "lock-closed", "timestamp": time.time()})

                    asyncio.create_task(_emit_closed())

            elif t == "audio-chunk":
                threading.Thread(target=_play_ptt, args=(msg.get("data", ""),), daemon=True).start()

            elif t == "register-expo-token":
                print(f"[ws] Expo token: {str(msg.get('token', ''))[:24]}…")

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        _clients.discard(ws)
        if not _clients:
            _streaming = False
        print(f"[ws] desligado — clientes: {len(_clients)}")


# ── Arranque ────────────────────────────────────────────────────────────────────
async def main() -> None:
    ws_server = await websockets.serve(_ws_handler, "0.0.0.0", WS_PORT)
    print(f"✓ WebSocket  ws://0.0.0.0:{WS_PORT}")

    http_cfg = uvicorn.Config(http_app, host="0.0.0.0", port=HTTP_PORT, log_level="warning")
    http_srv = uvicorn.Server(http_cfg)
    print(f"✓ HTTP API   http://0.0.0.0:{HTTP_PORT}")
    print("Portly Pi Server a correr — Ctrl+C para parar\n")

    await asyncio.gather(ws_server.wait_closed(), http_srv.serve())


if __name__ == "__main__":
    asyncio.run(main())
