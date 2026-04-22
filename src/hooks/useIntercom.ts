import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { showLocalDoorbell } from '../services/notifications';
import { intercomService } from '../services/intercom';

type Options = {
  /** Subscribe to video frame updates (only needed on LiveIntercom screen) */
  subscribeFrames?: boolean;
};

export function useIntercom({ subscribeFrames = false }: Options = {}) {
  const [connected, setConnected] = useState(false);
  const [hasBell, setHasBell] = useState(false);
  const [bellTimestamp, setBellTimestamp] = useState<string | null>(null);
  const [latestFrame, setLatestFrame] = useState<string | null>(null);
  const [doorStatus, setDoorStatus] = useState<'open' | 'closed'>('closed');

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    intercomService.connect();

    const unsub = intercomService.subscribe((msg) => {
      switch (msg.type) {
        case 'connected':
          setConnected(true);
          break;
        case 'disconnected':
          setConnected(false);
          break;
        case 'bell':
          setHasBell(true);
          setBellTimestamp(msg.timestamp);
          // If app is in background, fire a local notification
          if (appStateRef.current !== 'active') {
            showLocalDoorbell().catch(() => {});
          }
          break;
        case 'frame':
          if (subscribeFrames) setLatestFrame(msg.data);
          break;
        case 'door_status':
          setDoorStatus(msg.status);
          break;
      }
    });

    return unsub;
  }, [subscribeFrames]);

  const startStream = useCallback(() => {
    intercomService.send({ type: 'start_stream' });
  }, []);

  const stopStream = useCallback(() => {
    intercomService.send({ type: 'stop_stream' });
  }, []);

  const openDoor = useCallback(() => {
    intercomService.send({ type: 'open_door' });
  }, []);

  const sendAudio = useCallback((base64: string) => {
    intercomService.send({ type: 'audio_chunk', data: base64 });
  }, []);

  const dismissBell = useCallback(() => {
    setHasBell(false);
  }, []);

  return {
    connected,
    hasBell,
    bellTimestamp,
    latestFrame,
    doorStatus,
    startStream,
    stopStream,
    openDoor,
    sendAudio,
    dismissBell,
  };
}
