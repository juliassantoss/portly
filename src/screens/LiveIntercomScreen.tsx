import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "../components/AppButton";
import { useIntercom } from "../hooks/useIntercom";
import { PI_HTTP_URL } from "../services/intercom";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "LiveIntercom">;

// M4A/AAC — decodable by ffmpeg on any platform
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
  },
  ios: {
    extension: ".m4a",
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: "audio/webm", bitsPerSecond: 32000 },
};

export function LiveIntercomScreen({ navigation }: Props) {
  const { connected, latestFrame, doorStatus, startStream, stopStream, openDoor, sendAudio } =
    useIntercom({ subscribeFrames: true });

  const [isTalking, setIsTalking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [doorOpening, setDoorOpening] = useState(false);
  const [listenStatus, setListenStatus] = useState<"off" | "connecting" | "on" | "error">("off");

  // Refs instead of state so effects always close over the latest object
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Configure audio session once on mount — allowsRecordingIOS stays true the
  // whole time so PTT and playback can coexist without toggling the mode.
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});

    return () => {
      // Full teardown when leaving the screen
      soundRef.current?.stopAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  // Start video stream
  useEffect(() => {
    if (connected) startStream();
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // Incoming audio stream: Pi mic → phone speaker (MP3 over HTTP)
  useEffect(() => {
    // Always tear down the previous sound first
    const prev = soundRef.current;
    soundRef.current = null;
    prev?.stopAsync().catch(() => {});
    prev?.unloadAsync().catch(() => {});

    if (isMuted || !connected) {
      setListenStatus("off");
      return;
    }

    let cancelled = false;
    setListenStatus("connecting");

    Audio.Sound.createAsync(
      { uri: `${PI_HTTP_URL}/audio-stream` },
      { shouldPlay: true, volume: 1.0 },
    )
      .then(({ sound }) => {
        if (cancelled) {
          sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
        setListenStatus("on");

        // Restart stream if it stops unexpectedly (e.g. Pi restarts)
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded && !cancelled) {
            soundRef.current = null;
            setListenStatus("error");
          }
        });
      })
      .catch(() => {
        if (!cancelled) setListenStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [isMuted, connected]); // eslint-disable-line react-hooks/exhaustive-deps

  const startTalking = useCallback(async () => {
    if (isTalking || recordingRef.current) return;
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) return;
    try {
      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      recordingRef.current = recording;
      setIsTalking(true);
    } catch (e) {
      console.warn("[ptt] start failed:", e);
    }
  }, [isTalking]);

  const stopTalking = useCallback(async () => {
    if (!recordingRef.current) return;
    setIsTalking(false);
    const rec = recordingRef.current;
    recordingRef.current = null;
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) return;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
      sendAudio(base64);
    } catch (e) {
      console.warn("[ptt] send failed:", e);
    }
  }, [sendAudio]);

  function handleOpenDoor() {
    openDoor();
    setDoorOpening(true);
    setTimeout(() => setDoorOpening(false), 11000);
  }

  const doorLabel = doorOpening
    ? "Porta a abrir…"
    : doorStatus === "open"
      ? "Porta aberta"
      : "Abrir porta";

  const audioStatusLabel =
    isMuted
      ? "Silenciado"
      : listenStatus === "on"
        ? "A ouvir"
        : listenStatus === "connecting"
          ? "A ligar…"
          : listenStatus === "error"
            ? "Sem audio"
            : "—";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>Voltar</Text>
          </Pressable>
          <View style={[styles.liveBadge, !connected && styles.liveBadgeOffline]}>
            <View style={[styles.recordDot, !connected && styles.recordDotOffline]} />
            <Text style={styles.liveText}>{connected ? "AO VIVO" : "OFFLINE"}</Text>
          </View>
        </View>

        {/* Video panel */}
        <View style={styles.videoPanel}>
          {latestFrame ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${latestFrame}` }}
              style={styles.videoFeed}
              resizeMode="cover"
            />
          ) : (
            <>
              <View style={styles.personHead} />
              <View style={styles.personBody} />
              <Text style={styles.cameraTitle}>Porta principal</Text>
              <Text style={styles.cameraSubtitle}>
                {connected ? "A aguardar feed de video…" : "Raspberry Pi desligado"}
              </Text>
            </>
          )}
          <View style={styles.timestamp}>
            <Text style={styles.timestampText}>
              {new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        </View>

        {/* Status */}
        <View style={styles.visitorCard}>
          <Text style={styles.visitorTitle}>
            {connected ? "Visitante aguardando" : "Pi desligado"}
          </Text>
          <Text style={styles.visitorText}>
            {`Porta: ${doorStatus === "open" ? "aberta" : "fechada"}  ·  Microfone Pi: ${audioStatusLabel}`}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <View style={styles.row}>
            <Pressable
              onPressIn={startTalking}
              onPressOut={stopTalking}
              style={[styles.pttButton, isTalking && styles.pttButtonActive, styles.flex]}
            >
              <Text style={[styles.pttLabel, isTalking && styles.pttLabelActive]}>
                {isTalking ? "A falar…" : "Falar (segurar)"}
              </Text>
            </Pressable>
            <AppButton
              label={isMuted ? "Ativar som" : "Silenciar"}
              onPress={() => setIsMuted((m) => !m)}
              style={styles.flex}
              variant="secondary"
            />
          </View>
          <AppButton label={doorLabel} onPress={handleOpenDoor} variant="secondary" />
          <AppButton
            label="Encerrar chamada"
            onPress={() => { stopStream(); navigation.navigate("Home"); }}
            variant="danger"
          />
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  container: {
    flex: 1,
    gap: 16,
    padding: 20,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: "800",
  },
  liveBadge: {
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.18)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  liveBadgeOffline: {
    backgroundColor: "rgba(100,100,100,0.2)",
  },
  recordDot: {
    backgroundColor: colors.danger,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  recordDotOffline: {
    backgroundColor: colors.textMuted,
  },
  liveText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: "900",
  },
  videoPanel: {
    alignItems: "center",
    backgroundColor: colors.surfaceDark,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 32,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    overflow: "hidden",
    padding: 24,
  },
  videoFeed: {
    borderRadius: 24,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  personHead: {
    backgroundColor: "#34425a",
    borderColor: "#52627d",
    borderRadius: 52,
    borderWidth: 2,
    height: 104,
    width: 104,
  },
  personBody: {
    backgroundColor: "#253047",
    borderTopLeftRadius: 70,
    borderTopRightRadius: 70,
    height: 124,
    marginTop: 18,
    width: 180,
  },
  cameraTitle: {
    color: colors.textInverse,
    fontSize: 25,
    fontWeight: "900",
    marginTop: 28,
  },
  cameraSubtitle: {
    color: "#9fb0c7",
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
  },
  timestamp: {
    backgroundColor: colors.overlay,
    borderRadius: 999,
    left: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: "absolute",
    top: 18,
  },
  timestampText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: "700",
  },
  visitorCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 24,
    gap: 8,
    padding: 18,
  },
  visitorTitle: {
    color: colors.textInverse,
    fontSize: 21,
    fontWeight: "900",
  },
  visitorText: {
    color: "#b7c6dd",
    fontSize: 14,
    lineHeight: 21,
  },
  controls: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  pttButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 18,
  },
  pttButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pttLabel: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  pttLabelActive: {
    color: colors.textInverse,
  },
});
