import React from 'react';
import { RtcSurfaceView } from 'react-native-agora';
import type { AgoraVideoViewProps } from './AgoraVideoView';

/**
 * Agora video surface — NATIVE. Renders the live video for the given uid
 * (0 = local camera preview).
 */
export function AgoraVideoView({ uid, style }: AgoraVideoViewProps) {
  return <RtcSurfaceView canvas={{ uid }} style={style as object} />;
}
