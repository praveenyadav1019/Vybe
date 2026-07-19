import React from "react";
import { View, type ViewStyle } from "react-native";
import type { RTCStream } from "./useWebRTCCall";

/**
 * WebRTC video surface — DEFAULT (web / Expo Go) stub.
 * Renders the fallback since RTCView is native-only.
 */
export interface RTCVideoViewProps {
  stream: RTCStream;
  style?: ViewStyle;
  /** Mirror the local front camera. */
  mirror?: boolean;
  objectFit?: "contain" | "cover";
  fallback?: React.ReactNode;
}

export function RTCVideoView({ style, fallback }: RTCVideoViewProps) {
  return <View style={style}>{fallback ?? null}</View>;
}
