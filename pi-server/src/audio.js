const { spawn } = require('child_process');

const DEVICE = process.env.AUDIO_DEVICE ?? 'plughw:0,0';
const RATE = process.env.AUDIO_SAMPLE_RATE ?? '16000';

let recordProc = null;
let playProc = null;

const ARECORD_ARGS = ['-D', DEVICE, '-f', 'S16_LE', '-r', RATE, '-c', '1', '-t', 'raw'];
const APLAY_ARGS = ['-D', DEVICE, '-f', 'S16_LE', '-r', RATE, '-c', '1', '-t', 'raw'];

// Write a WAV header so HTTP clients (expo-av) can stream the audio
function wavHeader(sampleRate = 16000, channels = 1, bitDepth = 16) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0, 'ascii');
  h.writeUInt32LE(0xffffffff, 4);      // unknown size (streaming)
  h.write('WAVE', 8, 'ascii');
  h.write('fmt ', 12, 'ascii');
  h.writeUInt32LE(16, 16);             // chunk size
  h.writeUInt16LE(1, 20);              // PCM
  h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28);
  h.writeUInt16LE(channels * (bitDepth / 8), 32);
  h.writeUInt16LE(bitDepth, 34);
  h.write('data', 36, 'ascii');
  h.writeUInt32LE(0xffffffff, 40);     // unknown data size (streaming)
  return h;
}

// Stream Pi microphone audio as WAV to an HTTP response (for expo-av playback)
function pipeAudioToResponse(res) {
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');

  try {
    const rec = spawn('arecord', ARECORD_ARGS);
    res.write(wavHeader(Number(RATE)));
    rec.stdout.pipe(res);

    rec.on('error', (e) => {
      console.warn('[audio] arecord error:', e.message);
      res.end();
    });

    res.on('close', () => rec.kill());
    return true;
  } catch (e) {
    console.warn('[audio] Could not start arecord:', e.message);
    return false;
  }
}

// Start streaming audio chunks over WebSocket (alternative to HTTP stream)
function startAudioCapture(onChunk) {
  if (recordProc) return;
  try {
    recordProc = spawn('arecord', ARECORD_ARGS);
    recordProc.stdout.on('data', (chunk) => onChunk(chunk.toString('base64')));
    recordProc.on('error', (e) => {
      console.warn('[audio] arecord not available:', e.message);
      recordProc = null;
    });
    console.log('[audio] Microphone capture started');
  } catch (e) {
    console.warn('[audio] Audio capture failed:', e.message);
  }
}

function stopAudioCapture() {
  if (recordProc) {
    recordProc.kill();
    recordProc = null;
    console.log('[audio] Microphone capture stopped');
  }
}

// App records each PTT press as a complete M4A/AAC file and sends base64 over WS.
// Decode via ffmpeg → raw PCM → aplay. Requires `sudo apt install ffmpeg`.
function playAudioChunk(base64m4a) {
  try {
    const buf = Buffer.from(base64m4a, 'base64');
    const ff = spawn('ffmpeg', [
      '-loglevel', 'error',
      '-i', 'pipe:0',
      '-f', 's16le', '-ar', RATE, '-ac', '1',
      'pipe:1',
    ]);
    const pl = spawn('aplay', APLAY_ARGS);
    ff.stdout.pipe(pl.stdin);
    ff.on('error', (e) => console.warn('[audio] ffmpeg not available:', e.message));
    pl.on('error', (e) => console.warn('[audio] aplay error:', e.message));
    ff.stdin.end(buf);
  } catch (e) {
    console.warn('[audio] playAudioChunk failed:', e.message);
  }
}

function stopPlayback() {
  if (playProc) {
    playProc.kill();
    playProc = null;
  }
}

module.exports = { pipeAudioToResponse, startAudioCapture, stopAudioCapture, playAudioChunk, stopPlayback };
