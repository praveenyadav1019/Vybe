/**
 * Agora call hook — DEFAULT (web / Expo Go) stub.
 *
 * react-native-agora is a native module that doesn't run on web or in Expo Go,
 * so this no-op keeps those targets bundling. The real engine lives in
 * `useAgoraCall.native.ts`, which Metro picks for native builds.
 */

export interface AgoraCallOptions {
  callId?: string;
  /** Join the channel while true. */
  active: boolean;
  /** Enable the camera track. */
  video: boolean;
}

export interface AgoraCall {
  remoteUid: number | null;
  joined: boolean;
  setMuted: (muted: boolean) => void;
  setCameraOff: (off: boolean) => void;
  setSpeaker: (on: boolean) => void;
  switchCamera: () => void;
  leave: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useAgoraCall(_opts: AgoraCallOptions): AgoraCall {
  return {
    remoteUid: null,
    joined: false,
    setMuted: () => {},
    setCameraOff: () => {},
    setSpeaker: () => {},
    switchCamera: () => {},
    leave: () => {},
  };
}
