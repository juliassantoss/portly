import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "../components/AppButton";
import { PortlyLogo } from "../components/PortlyLogo";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Ola, Julia</Text>
            <Text style={styles.subtitle}>Porta principal esta monitorada</Text>
          </View>
          <PortlyLogo showWordmark={false} size="small" />
        </View>

        <View style={styles.liveCard}>
          <View style={styles.liveHeader}>
            <View>
              <Text style={styles.liveLabel}>Camera da entrada</Text>
              <Text style={styles.liveTitle}>Sem chamada ativa</Text>
            </View>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          </View>

          <View style={styles.preview}>
            <View style={styles.previewCamera}>
              <View style={styles.previewLens} />
            </View>
            <Text style={styles.previewTitle}>Feed de video simulado</Text>
            <Text style={styles.previewText}>
              Aqui entra a transmissao da camera quando o Raspberry Pi estiver ligado.
            </Text>
          </View>

          <AppButton
            label="Abrir camera ao vivo"
            onPress={() => navigation.navigate("LiveIntercom")}
          />
        </View>

        <View style={styles.alertCard}>
          <Text style={styles.alertKicker}>Campainha</Text>
          <Text style={styles.alertTitle}>Visitante na porta</Text>
          <Text style={styles.alertText}>
            Simulacao de uma chamada recebida. Serve para testar o fluxo do video-porteiro.
          </Text>
          <View style={styles.row}>
            <AppButton
              label="Atender"
              onPress={() => navigation.navigate("LiveIntercom")}
              style={styles.flex}
            />
            <AppButton
              label="Ver depois"
              onPress={() => navigation.navigate("Activity")}
              style={styles.flex}
              variant="secondary"
            />
          </View>
        </View>

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
          <Text style={styles.infoLine}>Supabase: preparado, ainda nao ligado</Text>
          <Text style={styles.infoLine}>Raspberry Pi: bridge mockada</Text>
          <Text style={styles.infoLine}>Expo Go: compativel nesta fase</Text>
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
  onlineBadge: {
    alignItems: "center",
    backgroundColor: "#e8f8ef",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  onlineDot: {
    backgroundColor: colors.success,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  onlineText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "800",
  },
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
