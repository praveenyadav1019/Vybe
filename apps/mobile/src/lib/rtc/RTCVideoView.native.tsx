import React from "react";
import { RTCView } from "react-native-webrtc";
import type { RTCVideoViewProps } from "./RTCVideoView";

/**
 * WebRTC video surface — NATIVE. Renders a MediaStream via RTCView.
 * Falls back to the provided placeholder while the stream is null.
 */
export function RTCVideoView({ stream, style, mirror, objectFit, fallback }: RTCVideoViewProps) {
  if (!stream) return <>{fallback ?? null}</>;
  return (
    <RTCView
      streamURL={stream.toURL()}
      style={style as object}
      objectFit={objectFit ?? "cover"}
      mirror={mirror ?? false}
      zOrder={0}
    />
  );
}
