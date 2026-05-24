import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "../components/AppButton";
import { PortlyLogo } from "../components/PortlyLogo";
import { supabase } from "../integrations/supabase/client";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !confirmEmail || !password || !confirmPassword) {
      Alert.alert("Atenção", "Preenche todos os campos.");
      return;
    }

    if (email !== confirmEmail) {
      Alert.alert("Atenção", "Os emails não coincidem.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Atenção", "As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Atenção", "A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (!supabase) {
      Alert.alert(
        "Registo indisponível",
        "Supabase não está configurado. Define EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no .env.",
      );
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });

    if (error) {
      setLoading(false);
      Alert.alert("Erro ao criar conta", error.message);
      return;
    }

    // Guarda o nome na tabela profiles
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        name,
      });
    }

    setLoading(false);
    Alert.alert(
      "Conta criada!",
      "Verifica o teu email para confirmar a conta e depois entra.",
      [{ text: "OK", onPress: () => navigation.replace("Login") }],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backText}>← Voltar</Text>
            </Pressable>
            <PortlyLogo centered size="small" showWordmark={false} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Criar conta</Text>
            <Text style={styles.formSubtitle}>Preenche os dados para te registares.</Text>

            <TextInput
              autoCapitalize="words"
              placeholder="Nome completo"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Confirmar email"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={confirmEmail}
              onChangeText={setConfirmEmail}
            />
            <TextInput
              placeholder="Senha (mínimo 6 caracteres)"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              placeholder="Confirmar senha"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <AppButton
              label={loading ? "A criar conta…" : "Criar conta"}
              onPress={handleRegister}
            />

            <Pressable onPress={() => navigation.replace("Login")} style={styles.loginLink}>
              <Text style={styles.loginText}>
                Já tens conta?{" "}
                <Text style={styles.loginTextBold}>Entrar</Text>
              </Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  container: {
    gap: 24,
    padding: 22,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
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
    fontSize: 26,
    fontWeight: "900",
  },
  formSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: -6,
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
  loginLink: {
    alignItems: "center",
    paddingVertical: 4,
  },
  loginText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  loginTextBold: {
    color: colors.primary,
    fontWeight: "700",
  },
});
