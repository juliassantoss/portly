const https = require('https');

// Expo Push Notification API — no SDK needed, plain HTTPS
function sendDoorbell(expoPushToken) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      to: expoPushToken,
      title: 'Campainha',
      body: 'Alguém está na porta!',
      sound: 'default',
      priority: 'high',
      channelId: 'doorbell',
      data: { screen: 'LiveIntercom' },
    });

    const options = {
      hostname: 'exp.host',
      path: '/--/push/v2/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.data?.status === 'error') {
            console.warn('[notify] Push error:', parsed.data.message);
          } else {
            console.log('[notify] Push sent to', expoPushToken.slice(0, 30) + '...');
          }
          resolve(parsed);
        } catch {
          resolve(body);
        }
      });
    });

    req.on('error', (e) => {
      console.warn('[notify] Push failed:', e.message);
      reject(e);
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { sendDoorbell };
