import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "../components/AppButton";
import { PortlyLogo } from "../components/PortlyLogo";
import { supabase } from "../integrations/supabase/client";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Atenção", "Preenche o email e a senha.");
      return;
    }

    if (!supabase) {
      Alert.alert(
        "Login indisponível",
        "Supabase não está configurado. Usa 'Continuar em modo demo' ou define EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no .env.",
      );
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert("Erro ao entrar", error.message);
    } else {
      navigation.replace("Home");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.hero}>
          <View style={styles.logoRow}>
            <PortlyLogo centered size="large" showWordmark={false} />
            <Text style={styles.brand}>Portly</Text>
          </View>
          <Text style={styles.title}>Veja quem está na porta.</Text>
          <Text style={styles.description}>
            Controle chamadas, câmera e abertura da porta direto pelo telefone.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Entrar no Portly</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="email@exemplo.com"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            placeholder="Senha"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
          <AppButton
            label={loading ? "A entrar…" : "Entrar"}
            onPress={handleLogin}
          />
          <AppButton
            label="Continuar em modo demo"
            onPress={() => navigation.replace("Home")}
            variant="ghost"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    padding: 22,
  },
  hero: {
    alignItems: "center",
    gap: 12,
    paddingTop: 36,
  },
  logoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  brand: {
    color: colors.primary,
    fontSize: 46,
    fontWeight: "900",
    letterSpacing: -1,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 36,
    textAlign: "center",
  },
  description: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 30,
    borderWidth: 1,
    gap: 14,
    padding: 20,
  },
  formTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 16,
  },
});
