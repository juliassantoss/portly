import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "../components/AppButton";
import { PortlyLogo } from "../components/PortlyLogo";
import { useIntercom } from "../hooks/useIntercom";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const { connected, hasBell, bellTimestamp, dismissBell } = useIntercom();

  function handleAnswer() {
    dismissBell();
    navigation.navigate("LiveIntercom");
  }

  function handleLater() {
    dismissBell();
    navigation.navigate("Activity");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Ola, Julia</Text>
            <Text style={styles.subtitle}>
              {connected ? "Porta principal monitorada" : "A ligar ao videoporteiro…"}
            </Text>
          </View>
          <PortlyLogo showWordmark={false} size="small" />
        </View>

        <View style={styles.liveCard}>
          <View style={styles.liveHeader}>
            <View>
              <Text style={styles.liveLabel}>Camera da entrada</Text>
              <Text style={styles.liveTitle}>
                {hasBell ? "Chamada recebida!" : "Sem chamada ativa"}
              </Text>
            </View>
            <View style={[styles.statusBadge, connected ? styles.onlineBadge : styles.offlineBadge]}>
              <View style={[styles.statusDot, connected ? styles.onlineDot : styles.offlineDot]} />
              <Text style={[styles.statusText, connected ? styles.onlineText : styles.offlineText]}>
                {connected ? "Online" : "Offline"}
              </Text>
            </View>
          </View>

          <View style={styles.preview}>
            <View style={styles.previewCamera}>
              <View style={styles.previewLens} />
            </View>
            <Text style={styles.previewTitle}>
              {connected ? "Pi ligado" : "Pi desligado"}
            </Text>
            <Text style={styles.previewText}>
              {connected
                ? 'Toque em "Abrir camera ao vivo" para ver o feed.'
                : "Ligue o servidor no Raspberry Pi para ativar a camera."}
            </Text>
          </View>

          <AppButton
            label="Abrir camera ao vivo"
            onPress={() => navigation.navigate("LiveIntercom")}
          />
        </View>

        {hasBell && (
          <View style={styles.alertCard}>
            <Text style={styles.alertKicker}>Campainha</Text>
            <Text style={styles.alertTitle}>Visitante na porta</Text>
            {bellTimestamp ? (
              <Text style={styles.alertText}>
                {new Date(bellTimestamp).toLocaleTimeString("pt-PT", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </Text>
            ) : null}
            <View style={styles.row}>
              <AppButton label="Atender" onPress={handleAnswer} style={styles.flex} />
              <AppButton
                label="Ver depois"
                onPress={handleLater}
                style={styles.flex}
                variant="secondary"
              />
            </View>
          </View>
        )}

        <View style={styles.grid}>
          <AppButton
            label="Historico"
            onPress={() => navigation.navigate("Activity")}
            style={styles.gridButton}
            variant="secondary"
          />
          <AppButton
            label="Definicoes"
            onPress={() => navigation.navigate("Settings")}
            style={styles.gridButton}
            variant="secondary"
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Estado do sistema</Text>
          <Text style={styles.infoLine}>
            Raspberry Pi: {connected ? "ligado" : "desligado"}
          </Text>
          <Text style={styles.infoLine}>
            Campainha: {hasBell ? "tocou recentemente" : "sem eventos"}
          </Text>
          <Text style={styles.infoLine}>Expo Go: compativel</Text>
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
    gap: 18,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  greeting: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 4,
  },
  liveCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 18,
    padding: 18,
  },
  liveHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  liveLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  liveTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },
  statusBadge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  onlineBadge: { backgroundColor: "#e8f8ef" },
  offlineBadge: { backgroundColor: "#f5f5f5" },
  statusDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  onlineDot: { backgroundColor: colors.success },
  offlineDot: { backgroundColor: colors.textMuted },
  statusText: { fontSize: 13, fontWeight: "800" },
  onlineText: { color: colors.success },
  offlineText: { color: colors.textMuted },
  preview: {
    alignItems: "center",
    backgroundColor: colors.backgroundDark,
    borderRadius: 24,
    justifyContent: "center",
    minHeight: 230,
    padding: 24,
  },
  previewCamera: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 42,
    borderWidth: 2,
    height: 84,
    justifyContent: "center",
    marginBottom: 18,
    width: 84,
  },
  previewLens: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  previewTitle: {
    color: colors.textInverse,
    fontSize: 19,
    fontWeight: "800",
  },
  previewText: {
    color: "#b7c6dd",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: "center",
  },
  alertCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 26,
    gap: 12,
    padding: 18,
  },
  alertKicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  alertTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  alertText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
  },
  gridButton: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  infoLine: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
