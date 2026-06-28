import React from 'react';
import { View, type ViewStyle } from 'react-native';

/**
 * Agora video surface — DEFAULT (web / Expo Go) stub.
 * Renders the provided fallback (a placeholder) since RtcSurfaceView is native-only.
 */
export interface AgoraVideoViewProps {
  /** Agora uid; 0 = local preview. */
  uid: number;
  style?: ViewStyle;
  fallback?: React.ReactNode;
}

export function AgoraVideoView({ style, fallback }: AgoraVideoViewProps) {
  return <View style={style}>{fallback ?? null}</View>;
}
