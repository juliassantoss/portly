import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Show alerts in foreground (handled by the app's UI as well)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// In Expo Go (SDK 53+) remote push is stripped out. Dev Build / production use full API.
const isExpoGo = Constants.appOwnership === 'expo';

export async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo) {
    console.log('[notifications] Skipping push registration in Expo Go — use Dev Build for notifications');
    return null;
  }

  // Push notifications only work on real devices
  if (!Device.isDevice) {
    console.warn('[notifications] Push tokens only available on physical devices');
    return null;
  }

  const { status: current } = await Notifications.getPermissionsAsync();
  const { status: final } =
    current !== 'granted'
      ? await Notifications.requestPermissionsAsync()
      : { status: current };

  if (final !== 'granted') {
    console.warn('[notifications] Permission denied');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('doorbell', {
      name: 'Campainha',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
      sound: 'default',
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    console.log('[notifications] Expo push token obtained');
    return token;
  } catch (e) {
    console.warn('[notifications] Could not get Expo push token (EAS not configured?):', e);
    return null;
  }
}

// Show a local notification immediately (used when app receives bell via WebSocket)
export async function showLocalDoorbell(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Campainha',
      body: 'Alguém está na porta!',
      sound: true,
      data: { screen: 'LiveIntercom' },
    },
    trigger: null,
  });
}
