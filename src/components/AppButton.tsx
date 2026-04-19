import { Pressable, StyleSheet, Text } from "react-native";
import type { ViewStyle } from "react-native";

import { colors } from "../theme/colors";

type AppButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  style?: ViewStyle;
};

export function AppButton({
  label,
  onPress,
  variant = "primary",
  style,
}: AppButtonProps) {
  const buttonStyle = {
    primary: styles.primary,
    secondary: styles.secondary,
    danger: styles.danger,
    ghost: styles.ghost,
  }[variant];

  const labelStyle = {
    primary: styles.primaryLabel,
    secondary: styles.secondaryLabel,
    danger: styles.dangerLabel,
    ghost: styles.ghostLabel,
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonStyle,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, labelStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 18,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  label: {
    fontSize: 16,
    fontWeight: "800",
  },
  primaryLabel: {
    color: colors.textInverse,
  },
  secondaryLabel: {
    color: colors.primary,
  },
  dangerLabel: {
    color: colors.textInverse,
  },
  ghostLabel: {
    color: colors.textMuted,
  },
});
