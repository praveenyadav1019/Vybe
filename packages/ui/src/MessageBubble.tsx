import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { vybeonTheme } from "./theme";

export interface MessageBubbleProps {
  text: string;
  mine?: boolean;
  time?: string;
  style?: ViewStyle;
}

export function MessageBubble({ text, mine, time, style }: MessageBubbleProps) {
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs, style]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={styles.text}>{text}</Text>
        {time ? <Text style={styles.time}>{time}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", marginVertical: 4, paddingHorizontal: 4 },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: vybeonTheme.radii.lg,
    borderWidth: 1,
  },
  bubbleMine: {
    backgroundColor: "rgba(124, 58, 237, 0.35)",
    borderColor: "rgba(124, 58, 237, 0.55)",
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    backgroundColor: vybeonTheme.colors.card,
    borderColor: vybeonTheme.colors.border,
    borderBottomLeftRadius: 6,
  },
  text: { color: vybeonTheme.colors.text, fontSize: 15, lineHeight: 20 },
  time: { color: vybeonTheme.colors.subtext, fontSize: 11, marginTop: 6 },
});
