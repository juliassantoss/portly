import { StyleSheet, Text, View } from "react-native";

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
  const lensSize = markSize * 0.52;
  const innerLensSize = markSize * 0.26;
  const doorWidth = markSize * 0.38;

  return (
    <View style={[styles.container, centered && styles.centered]}>
      <View
        style={[
          styles.mark,
          {
            width: markSize,
            height: markSize,
            borderRadius: markSize * 0.22,
          },
        ]}
      >
        <View
          style={[
            styles.cameraRing,
            {
              width: lensSize,
              height: lensSize,
              borderRadius: lensSize / 2,
            },
          ]}
        >
          <View
            style={[
              styles.cameraLens,
              {
                width: innerLensSize,
                height: innerLensSize,
                borderRadius: innerLensSize / 2,
              },
            ]}
          />
        </View>
        <View
          style={[
            styles.door,
            {
              width: doorWidth,
              height: markSize * 0.34,
              borderTopLeftRadius: doorWidth / 2,
              borderTopRightRadius: doorWidth / 2,
            },
          ]}
        />
      </View>

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
  mark: {
    alignItems: "center",
    backgroundColor: colors.primary,
    justifyContent: "center",
    overflow: "hidden",
  },
  cameraRing: {
    alignItems: "center",
    backgroundColor: colors.textInverse,
    justifyContent: "center",
    marginBottom: 10,
  },
  cameraLens: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.accent,
    borderWidth: 3,
  },
  door: {
    backgroundColor: colors.textInverse,
    marginTop: 2,
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
