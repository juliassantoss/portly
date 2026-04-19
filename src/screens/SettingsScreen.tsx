import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

const rows = [
  ["Camera", "Mock visual ativo"],
  ["Raspberry Pi", "Aguardando contrato da bridge"],
  ["Supabase", "Variaveis preparadas"],
  ["Fechadura", "Acao simulada"],
  ["Expo Go", "Compativel nesta fase"],
];

export function SettingsScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>Voltar</Text>
          </Pressable>
          <Text style={styles.title}>Sistema</Text>
        </View>

        <View style={styles.deviceCard}>
          <Text style={styles.cardKicker}>Dispositivo</Text>
          <Text style={styles.cardTitle}>Porta principal</Text>
          <Text style={styles.cardText}>
            Area para configurar a camera, microfone, campainha e comandos do Raspberry Pi.
          </Text>
        </View>

        <View style={styles.listCard}>
          {rows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Importante para Expo Go</Text>
          <Text style={styles.noticeText}>
            Video real, audio bidirecional e hardware podem exigir build de desenvolvimento
            quando forem implementados. Agora estas telas sao apenas a base visual.
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
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
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
  listCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 6,
    padding: 18,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  rowValue: {
    color: colors.textMuted,
    fontSize: 14,
  },
  notice: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 24,
    gap: 8,
    padding: 18,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  noticeText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
});
