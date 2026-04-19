import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "../components/AppButton";
import { PortlyLogo } from "../components/PortlyLogo";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const enterDemo = () => navigation.replace("Home");

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.hero}>
          <PortlyLogo centered size="large" />
          <Text style={styles.title}>Veja quem esta na porta.</Text>
          <Text style={styles.description}>
            Controle chamadas, camera e abertura da porta direto pelo telefone.
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
          />
          <TextInput
            placeholder="Senha"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={styles.input}
          />
          <AppButton label="Entrar" onPress={enterDemo} />
          <AppButton
            label="Continuar em modo demo"
            onPress={enterDemo}
            variant="ghost"
          />
          <Text style={styles.note}>
            Login visual apenas. A autenticacao real entra depois com Supabase.
          </Text>
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
    gap: 16,
    paddingTop: 36,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
    lineHeight: 40,
    textAlign: "center",
  },
  description: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
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
  note: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
