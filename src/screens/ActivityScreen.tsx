import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Activity">;

const events = [
  {
    title: "Campainha tocou",
    time: "Hoje, 21:50",
    description: "Visitante detectado na porta principal.",
    status: "Nao atendida",
  },
  {
    title: "Porta aberta",
    time: "Hoje, 18:12",
    description: "Abertura acionada pelo app em modo demo.",
    status: "Concluido",
  },
  {
    title: "Movimento detectado",
    time: "Ontem, 22:08",
    description: "Movimento proximo a camera externa.",
    status: "Gravado",
  },
];

export function ActivityScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>Voltar</Text>
          </Pressable>
          <Text style={styles.title}>Historico</Text>
        </View>

        <Text style={styles.description}>
          Eventos simulados para o fluxo inicial do video-porteiro.
        </Text>

        {events.map((event) => (
          <View key={`${event.title}-${event.time}`} style={styles.eventCard}>
            <View style={styles.eventDot} />
            <View style={styles.eventContent}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.status}>{event.status}</Text>
              </View>
              <Text style={styles.eventTime}>{event.time}</Text>
              <Text style={styles.eventDescription}>{event.description}</Text>
            </View>
          </View>
        ))}
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
  description: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 18,
  },
  eventDot: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 16,
    marginTop: 4,
    width: 16,
  },
  eventContent: {
    flex: 1,
    gap: 6,
  },
  eventHeader: {
    alignItems: "flex-start",
    gap: 8,
  },
  eventTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  eventTime: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  eventDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  status: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
