/**
 * WebRTC call hook — NATIVE (iOS/Android) via react-native-webrtc.
 *
 * Drives a single peer connection: captures local media, negotiates SDP over
 * the injected signaling channel (deterministic offerer/answerer roles), relays
 * ICE candidates, and exposes imperative controls. Requires an EAS dev/prod
 * build (react-native-webrtc is a native module — not available in Expo Go).
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  type MediaStream,
  type MediaStreamTrack,
} from "react-native-webrtc";
import type { WebRTCCall, WebRTCCallOptions } from "./useWebRTCCall";

async function ensurePermissions(video: boolean) {
  if (Platform.OS !== "android") return;
  const perms = ["android.permission.RECORD_AUDIO"];
  if (video) perms.push("android.permission.CAMERA");
  try {
    await PermissionsAndroid.requestMultiple(perms as never);
  } catch {
    /* ignore — getUserMedia will reject and we surface a failed connection */
  }
}

export function useWebRTCCall({
  active,
  video,
  isOfferer,
  iceServers,
  signaling,
}: WebRTCCallOptions): WebRTCCall {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const pendingIce = useRef<RTCIceCandidate[]>([]);
  const remoteSet = useRef(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<string>("new");

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    (async () => {
      try {
        await ensurePermissions(video);

        // 1. Capture local media.
        const stream = (await mediaDevices.getUserMedia({
          audio: true,
          video: video ? { facingMode: "user" } : false,
        })) as unknown as MediaStream;
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localRef.current = stream;
        setLocalStream(stream);

        // 2. Build the peer connection.
        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // 3. Wire events.
        (pc as any).addEventListener("icecandidate", (event: any) => {
          if (event.candidate) signaling.sendIce(event.candidate);
        });
        (pc as any).addEventListener("track", (event: any) => {
          if (event.streams && event.streams[0]) setRemoteStream(event.streams[0]);
        });
        (pc as any).addEventListener("connectionstatechange", () => {
          setConnectionState(pc.connectionState);
        });

        // 4. Signaling handlers.
        const flushPendingIce = async () => {
          for (const c of pendingIce.current) {
            try {
              await pc.addIceCandidate(c);
            } catch {
              /* ignore late/duplicate candidates */
            }
          }
          pendingIce.current = [];
        };

        unsubs.push(
          signaling.onOffer(async (sdp) => {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(sdp as any));
              remoteSet.current = true;
              await flushPendingIce();
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              signaling.sendAnswer(answer);
            } catch {
              /* negotiation failed — connection state surfaces the error */
            }
          }),
        );

        unsubs.push(
          signaling.onAnswer(async (sdp) => {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(sdp as any));
              remoteSet.current = true;
              await flushPendingIce();
            } catch {
              /* ignore */
            }
          }),
        );

        unsubs.push(
          signaling.onIce(async (candidate) => {
            const ice = new RTCIceCandidate(candidate as any);
            if (remoteSet.current) {
              try {
                await pc.addIceCandidate(ice);
              } catch {
                /* ignore */
              }
            } else {
              // Buffer until remote description is set.
              pendingIce.current.push(ice);
            }
          }),
        );

        // 5. Offerer kicks off negotiation.
        if (isOfferer) {
          const offer = await pc.createOffer({});
          await pc.setLocalDescription(offer);
          signaling.sendOffer(offer);
        }
      } catch {
        setConnectionState("failed");
      }
    })();

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
      pendingIce.current = [];
      remoteSet.current = false;
      try {
        localRef.current?.getTracks().forEach((t) => t.stop());
        pcRef.current?.close();
      } catch {
        /* ignore */
      }
      pcRef.current = null;
      localRef.current = null;
      setLocalStream(null);
      setRemoteStream(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, video, isOfferer]);

  const setMuted = useCallback((muted: boolean) => {
    localRef.current?.getAudioTracks().forEach((t: MediaStreamTrack) => {
      t.enabled = !muted;
    });
  }, []);

  const setCameraOff = useCallback((off: boolean) => {
    localRef.current?.getVideoTracks().forEach((t: MediaStreamTrack) => {
      t.enabled = !off;
    });
  }, []);

  const switchCamera = useCallback(() => {
    localRef.current?.getVideoTracks().forEach((t: any) => {
      if (typeof t._switchCamera === "function") t._switchCamera();
    });
  }, []);

  // Audio output routing (earpiece <-> speaker) requires a native audio-session
  // manager (e.g. react-native-incall-manager). react-native-webrtc doesn't
  // expose it, so this is a no-op placeholder — wire InCallManager to enable.
  const setSpeaker = useCallback((_on: boolean) => {}, []);

  const leave = useCallback(() => {
    try {
      localRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
    } catch {
      /* ignore */
    }
    pcRef.current = null;
  }, []);

  return {
    localStream,
    remoteStream,
    connected: connectionState === "connected",
    connectionState,
    setMuted,
    setCameraOff,
    setSpeaker,
    switchCamera,
    leave,
  };
}
