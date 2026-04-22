const { spawn } = require('child_process');

const WIDTH = process.env.CAMERA_WIDTH ?? '640';
const HEIGHT = process.env.CAMERA_HEIGHT ?? '480';
const FPS = Number(process.env.CAMERA_FPS ?? 5);
const INTERVAL_MS = Math.round(1000 / FPS);

let captureTimer = null;

// Ordered list of capture commands to try (first one that works wins)
const CAPTURE_CMDS = [
  {
    cmd: 'libcamera-still',
    args: ['-o', '-', '--immediate', '-n', '--width', WIDTH, '--height', HEIGHT, '--quality', '75'],
  },
  {
    cmd: 'raspistill',
    args: ['-o', '-', '-n', '-t', '1', '-w', WIDTH, '-h', HEIGHT, '-q', '75'],
  },
  {
    cmd: 'fswebcam',
    args: ['-r', `${WIDTH}x${HEIGHT}`, '--jpeg', '75', '--no-banner', '-'],
  },
];

let workingCmdIndex = -1; // cache which command works

function captureFrame() {
  return new Promise((resolve, reject) => {
    const startIndex = workingCmdIndex >= 0 ? workingCmdIndex : 0;
    let tried = startIndex;

    function attempt(index) {
      if (index >= CAPTURE_CMDS.length) {
        reject(new Error('No working camera command found'));
        return;
      }

      const { cmd, args } = CAPTURE_CMDS[index];
      const proc = spawn(cmd, args);
      const chunks = [];
      let errored = false;

      proc.stdout.on('data', (d) => chunks.push(d));
      proc.on('error', () => { errored = true; attempt(index + 1); });
      proc.on('close', (code) => {
        if (errored) return;
        if (code === 0 && chunks.length > 0) {
          workingCmdIndex = index;
          resolve(Buffer.concat(chunks).toString('base64'));
        } else {
          attempt(index + 1);
        }
      });
    }

    attempt(tried);
  });
}

function startCameraStream(onFrame) {
  if (captureTimer) return;
  captureTimer = setInterval(() => {
    captureFrame()
      .then((frame) => onFrame(frame))
      .catch(() => {});
  }, INTERVAL_MS);
  console.log(`[camera] Streaming at ${FPS} FPS (${INTERVAL_MS}ms interval)`);
}

function stopCameraStream() {
  if (captureTimer) {
    clearInterval(captureTimer);
    captureTimer = null;
    console.log('[camera] Stream stopped');
  }
}

module.exports = { startCameraStream, stopCameraStream };
