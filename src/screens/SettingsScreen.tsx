import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export function SettingsScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <Text style={styles.title}>Definições</Text>
        </View>

        <View style={styles.deviceCard}>
          <Text style={styles.cardKicker}>Dispositivo</Text>
          <Text style={styles.cardTitle}>Porta principal</Text>
          <Text style={styles.cardText}>
            Área para configurar a câmera, microfone, campainha e comandos do Raspberry Pi.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    gap: 16,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  backArrow: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: "700",
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
  },
  deviceCard: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    gap: 10,
    padding: 22,
  },
  cardKicker: {
    color: "#bfe8ff",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  cardTitle: {
    color: colors.textInverse,
    fontSize: 28,
    fontWeight: "900",
  },
  cardText: {
    color: "#dceaff",
    fontSize: 15,
    lineHeight: 22,
  },
});
