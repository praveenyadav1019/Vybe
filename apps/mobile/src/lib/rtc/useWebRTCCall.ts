/**
 * WebRTC call hook — DEFAULT (web / Expo Go) stub.
 *
 * react-native-webrtc is a native module that doesn't run on web or in Expo Go,
 * so this no-op keeps those targets bundling. The real peer-connection engine
 * lives in `useWebRTCCall.native.ts`, which Metro picks for native builds.
 */

/** A renderable media stream (native `MediaStream`; only `.toURL()` is used by the view). */
export type RTCStream = { toURL(): string } | null;

export interface RTCIceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/**
 * Transport-agnostic signaling channel. Callers wire this to socket.io events
 * (`webrtc:*` for 1:1 calls, `stranger:webrtc-*` for random chat). Each `on*`
 * returns an unsubscribe function.
 */
export interface RTCSignaling {
  sendOffer: (sdp: unknown) => void;
  sendAnswer: (sdp: unknown) => void;
  sendIce: (candidate: unknown) => void;
  onOffer: (cb: (sdp: unknown) => void) => () => void;
  onAnswer: (cb: (sdp: unknown) => void) => () => void;
  onIce: (cb: (candidate: unknown) => void) => () => void;
}

export interface WebRTCCallOptions {
  /** Establish/keep the connection while true. */
  active: boolean;
  /** Capture + send a camera track (false = audio-only call). */
  video: boolean;
  /** Deterministic role: the offerer creates the SDP offer. */
  isOfferer: boolean;
  /** ICE servers (STUN + short-lived TURN creds) from the API. */
  iceServers: RTCIceServerConfig[];
  signaling: RTCSignaling;
}

export interface WebRTCCall {
  localStream: RTCStream;
  remoteStream: RTCStream;
  /** True once the peer connection reaches "connected". */
  connected: boolean;
  connectionState: string;
  setMuted: (muted: boolean) => void;
  setCameraOff: (off: boolean) => void;
  setSpeaker: (on: boolean) => void;
  switchCamera: () => void;
  leave: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useWebRTCCall(_opts: WebRTCCallOptions): WebRTCCall {
  return {
    localStream: null,
    remoteStream: null,
    connected: false,
    connectionState: "new",
    setMuted: () => {},
    setCameraOff: () => {},
    setSpeaker: () => {},
    switchCamera: () => {},
    leave: () => {},
  };
}
