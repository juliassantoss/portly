import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppNavigator } from "./src/navigation/AppNavigator";
import { registerForPushNotifications } from "./src/services/notifications";
import { intercomService } from "./src/services/intercom";
import { colors } from "./src/theme/colors";
import type { RootStackParamList } from "./src/navigation/types";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

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
  useEffect(() => {
    // Register for push notifications and share token with Pi
    registerForPushNotifications().then((token) => {
      if (token) intercomService.setToken(token);
    });

    // Navigate to LiveIntercom when user taps a doorbell notification
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen;
      if (screen === "LiveIntercom" && navigationRef.isReady()) {
        navigationRef.navigate("LiveIntercom");
      }
    });

    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme} ref={navigationRef}>
        <StatusBar style="dark" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
