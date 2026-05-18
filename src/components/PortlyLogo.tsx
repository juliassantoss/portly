import { Image, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";

type PortlyLogoProps = {
  size?: "small" | "medium" | "large";
  showWordmark?: boolean;
  centered?: boolean;
};

const markSizes = {
  small: 42,
  medium: 72,
  large: 116,
};

export function PortlyLogo({
  size = "medium",
  showWordmark = true,
  centered = false,
}: PortlyLogoProps) {
  const markSize = markSizes[size];

  return (
    <View style={[styles.container, centered && styles.centered]}>
      <Image
        source={require("../../assets/logo.png")}
        style={[
          styles.logo,
          {
            width: markSize,
            height: markSize,
            borderRadius: markSize * 0.22,
          },
        ]}
        resizeMode="contain"
      />

      {showWordmark ? (
        <Text style={[styles.wordmark, size === "large" && styles.largeWordmark]}>
          Portly
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  centered: {
    justifyContent: "center",
  },
  logo: {
    overflow: "hidden",
  },
  wordmark: {
    color: colors.primary,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },
  largeWordmark: {
    fontSize: 46,
  },
});
