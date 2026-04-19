import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ActivityScreen } from "../screens/ActivityScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LiveIntercomScreen } from "../screens/LiveIntercomScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen component={LoginScreen} name="Login" />
      <Stack.Screen
        component={HomeScreen}
        name="Home"
      />
      <Stack.Screen component={LiveIntercomScreen} name="LiveIntercom" />
      <Stack.Screen component={ActivityScreen} name="Activity" />
      <Stack.Screen component={SettingsScreen} name="Settings" />
    </Stack.Navigator>
  );
}
