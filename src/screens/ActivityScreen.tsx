import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../integrations/supabase/client";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Activity">;

type Event = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
};

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Hoje, ${time}`;
  if (isYesterday) return `Ontem, ${time}`;
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }) + `, ${time}`;
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    answered: "Atendida",
    missed: "Não atendida",
    completed: "Concluído",
    recorded: "Gravado",
    pending: "Pendente",
  };
  return map[status] ?? status;
}

export function ActivityScreen({ navigation }: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) setEvents(data);
      setLoading(false);
    }
    fetchEvents();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <Text style={styles.title}>Histórico</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : events.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sem eventos</Text>
            <Text style={styles.emptyText}>
              Os eventos da campainha e da câmera aparecerão aqui.
            </Text>
          </View>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventDot} />
              <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.status}>{statusLabel(event.status)}</Text>
                </View>
                <Text style={styles.eventTime}>{formatTime(event.created_at)}</Text>
                {event.description ? (
                  <Text style={styles.eventDescription}>{event.description}</Text>
                ) : null}
              </View>
            </View>
          ))
        )}
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
  emptyState: {
    alignItems: "center",
    gap: 10,
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
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
