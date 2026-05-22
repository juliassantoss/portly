#!/usr/bin/env bash
# Portly — instala o servidor no Raspberry Pi 5 (webcam USB, sem GPIO)
# Corre uma vez: bash setup.sh
set -e

echo "=== Portly Pi Server — Setup ==="

# 1. Dependências do sistema
sudo apt-get update -y
sudo apt-get install -y python3-pip python3-venv ffmpeg alsa-utils

# 2. Virtualenv
python3 -m venv venv
source venv/bin/activate

# 3. Dependências Python
pip install --upgrade pip
pip install "fastapi>=0.115.0" "uvicorn[standard]>=0.30.0" "websockets>=13.0" "opencv-python-headless>=4.9.0"

echo ""
echo "=== Verificar webcam ==="
echo "  ls /dev/video*          → deve aparecer /dev/video0"
echo "  v4l2-ctl --list-devices  → lista câmaras disponíveis"
echo ""
echo "=== Verificar microfone ==="
echo "  arecord -l              → lista placas de áudio (procura a webcam)"
echo ""
echo "=== Testar o servidor ==="
echo "  source venv/bin/activate"
echo "  python main.py"
echo ""
echo "=== Instalar como serviço (arranque automático) ==="
echo "  sudo cp portly.service /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable --now portly"
echo ""
echo "=== Concluído ==="
