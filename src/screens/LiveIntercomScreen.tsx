import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "../components/AppButton";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "LiveIntercom">;

export function LiveIntercomScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>Voltar</Text>
          </Pressable>
          <View style={styles.liveBadge}>
            <View style={styles.recordDot} />
            <Text style={styles.liveText}>AO VIVO</Text>
          </View>
        </View>

        <View style={styles.videoPanel}>
          <View style={styles.personHead} />
          <View style={styles.personBody} />
          <Text style={styles.cameraTitle}>Porta principal</Text>
          <Text style={styles.cameraSubtitle}>Video simulado da camera externa</Text>
          <View style={styles.timestamp}>
            <Text style={styles.timestampText}>Hoje - 21:50</Text>
          </View>
        </View>

        <View style={styles.visitorCard}>
          <Text style={styles.visitorTitle}>Visitante aguardando</Text>
          <Text style={styles.visitorText}>
            Audio e video reais entram quando a camera e o Raspberry Pi estiverem ligados.
          </Text>
        </View>

        <View style={styles.controls}>
          <View style={styles.row}>
            <AppButton label="Falar" onPress={() => undefined} style={styles.flex} />
            <AppButton
              label="Silenciar"
              onPress={() => undefined}
              style={styles.flex}
              variant="secondary"
            />
          </View>
          <AppButton label="Abrir porta" onPress={() => undefined} variant="secondary" />
          <AppButton label="Encerrar chamada" onPress={() => navigation.navigate("Home")} variant="danger" />
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
  recordDot: {
    backgroundColor: colors.danger,
    borderRadius: 5,
    height: 10,
    width: 10,
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
});
