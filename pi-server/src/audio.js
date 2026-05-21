const { spawn } = require('child_process');

// Separate input/output devices. Defaults assume:
//   - Mic on a USB webcam (e.g. Logitech C210 at plughw:2,0)
//   - Output via PipeWire `default` sink (e.g. paired BT speaker)
// Override via .env: AUDIO_INPUT / AUDIO_OUTPUT.
const INPUT_DEVICE = process.env.AUDIO_INPUT ?? process.env.AUDIO_DEVICE ?? 'plughw:2,0';
const OUTPUT_DEVICE = process.env.AUDIO_OUTPUT ?? 'default';
const RATE = process.env.AUDIO_SAMPLE_RATE ?? '16000';

let recordProc = null;
let playProc = null;

const ARECORD_ARGS = ['-D', INPUT_DEVICE, '-f', 'S16_LE', '-r', RATE, '-c', '1', '-t', 'raw'];
const APLAY_ARGS = ['-D', OUTPUT_DEVICE, '-f', 'S16_LE', '-r', RATE, '-c', '1', '-t', 'raw'];

// Stream Pi microphone audio as MP3 to an HTTP response.
// MP3 streams reliably on Android (ExoPlayer) and iOS (AVPlayer) — much more
// compatible than chunked WAV with unknown size.
function pipeAudioToResponse(res) {
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-cache');

  try {
    const rec = spawn('arecord', ARECORD_ARGS);
    const ff = spawn('ffmpeg', [
      '-loglevel', 'error',
      '-f', 's16le', '-ar', RATE, '-ac', '1', '-i', 'pipe:0',
      '-f', 'mp3', '-b:a', '32k', '-acodec', 'libmp3lame',
      'pipe:1',
    ]);

    rec.stdout.pipe(ff.stdin);
    ff.stdout.pipe(res);

    rec.on('error', (e) => {
      console.warn('[audio] arecord error:', e.message);
      ff.kill();
      res.end();
    });
    ff.stderr.on('data', (d) => console.warn('[audio][ff-stream]', d.toString().trim()));
    ff.on('error', (e) => { console.warn('[audio] ffmpeg stream error:', e.message); res.end(); });

    res.on('close', () => { rec.kill(); ff.kill(); });
    console.log('[audio] /audio-stream started (MP3)');
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
    console.log(`[audio] playing chunk (${buf.length} bytes) → ${OUTPUT_DEVICE}`);
    const ff = spawn('ffmpeg', [
      '-loglevel', 'error',
      '-i', 'pipe:0',
      '-f', 's16le', '-ar', RATE, '-ac', '1',
      'pipe:1',
    ]);
    const pl = spawn('aplay', APLAY_ARGS);
    ff.stdout.pipe(pl.stdin);
    ff.on('error', (e) => console.warn('[audio] ffmpeg not available:', e.message));
    ff.stderr.on('data', (d) => console.warn('[audio][ffmpeg]', d.toString().trim()));
    pl.on('error', (e) => console.warn('[audio] aplay error:', e.message));
    pl.stderr.on('data', (d) => console.warn('[audio][aplay]', d.toString().trim()));
    pl.on('close', (code) => console.log(`[audio] aplay exited ${code}`));
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
