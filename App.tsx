import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppNavigator } from "./src/navigation/AppNavigator";
import { registerForPushNotifications } from "./src/services/notifications";
import { intercomService } from "./src/services/intercom";
import { colors } from "./src/theme/colors";
import type { RootStackParamList } from "./src/navigation/types";

const BELL_RING_MAX_MS = 30_000;

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const isExpoGo = Constants.appOwnership === 'expo';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    primary: colors.primary,
    text: colors.text,
    border: colors.border,
  },
};

export default function App() {
  const bellSoundRef = useRef<Audio.Sound | null>(null);
  const bellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stopBell = async () => {
      if (bellTimerRef.current) { clearTimeout(bellTimerRef.current); bellTimerRef.current = null; }
      const s = bellSoundRef.current;
      bellSoundRef.current = null;
      if (s) {
        try { await s.stopAsync(); } catch {}
        try { await s.unloadAsync(); } catch {}
      }
    };

    const startBell = async () => {
      await stopBell();
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("./assets/sounds/doorbell.mp3"),
          { isLooping: true, shouldPlay: true, volume: 1 },
        );
        bellSoundRef.current = sound;
        bellTimerRef.current = setTimeout(() => { void stopBell(); }, BELL_RING_MAX_MS);
      } catch {}
    };

    // Register for push notifications and share token with Pi
    registerForPushNotifications().then((token) => {
      if (token) intercomService.setToken(token);
    });

    // Bell ringtone: play on bell event unless already attending the call
    const unsubBell = intercomService.subscribe((msg) => {
      if (msg.type !== "bell") return;
      const route = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
      if (route === "LiveIntercom") return;
      void startBell();
    });

    // Notification listener not supported in Expo Go on Android (SDK 53+)
    let sub: ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | undefined;
    if (!(isExpoGo && Platform.OS === "android")) {
      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const screen = response.notification.request.content.data?.screen;
        if (screen === "LiveIntercom" && navigationRef.isReady()) {
          navigationRef.navigate("LiveIntercom");
        }
      });
    }

    return () => {
      unsubBell();
      sub?.remove();
      void stopBell();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={navigationTheme}
        ref={navigationRef}
        onStateChange={() => {
          // Stop bell sound as soon as user enters the live call view
          const route = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
          if (route === "LiveIntercom") {
            const s = bellSoundRef.current;
            bellSoundRef.current = null;
            if (bellTimerRef.current) { clearTimeout(bellTimerRef.current); bellTimerRef.current = null; }
            if (s) { s.stopAsync().catch(() => {}); s.unloadAsync().catch(() => {}); }
          }
        }}
      >
        <StatusBar style="dark" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
