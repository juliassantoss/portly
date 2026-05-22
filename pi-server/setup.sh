#!/usr/bin/env bash
# Portly — instala o servidor no Raspberry Pi 5
# Corre uma vez: bash setup.sh
set -e

echo "=== Portly Pi Server — Setup ==="

# 1. Dependências do sistema
sudo apt-get update -y
sudo apt-get install -y python3-pip python3-venv ffmpeg alsa-utils

# picamera2 vem pelo apt (inclui dependências nativas)
sudo apt-get install -y python3-picamera2 --no-install-recommends

# Habilita câmara no /boot/firmware/config.txt se não estiver
if ! grep -q "^camera_auto_detect=1" /boot/firmware/config.txt 2>/dev/null; then
    echo "camera_auto_detect=1" | sudo tee -a /boot/firmware/config.txt
    echo "→ Câmara habilitada em config.txt — reinicia o Pi depois do setup."
fi

# 2. Virtualenv (system-site-packages para usar picamera2 do apt)
python3 -m venv --system-site-packages venv
source venv/bin/activate

# 3. Dependências Python (websockets, fastapi, uvicorn, gpiozero)
pip install --upgrade pip
pip install "fastapi>=0.115.0" "uvicorn[standard]>=0.30.0" "websockets>=13.0" "gpiozero>=2.0"

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
