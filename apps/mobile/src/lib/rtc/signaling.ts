/**
 * Socket.IO signaling adapters for WebRTC. Two conventions exist on the server:
 *   - 1:1 calls:     `webrtc:offer|answer|ice`         (payload targets a userId)
 *   - stranger chat: `stranger:webrtc-offer|answer|ice` (server infers partner)
 */
import { socketClient } from "../socket";
import type { RTCSignaling } from "./useWebRTCCall";

type AnyPayload = Record<string, unknown>;

function subscribe(event: string, extract: (p: AnyPayload) => unknown, cb: (v: unknown) => void) {
  const handler = (...args: unknown[]) => cb(extract((args[0] as AnyPayload) ?? {}));
  socketClient.on(event, handler);
  return () => socketClient.off(event, handler);
}

/** 1:1 call signaling — payloads carry `targetUserId` + optional `callId`. */
export function callSignaling(peerUserId: string, callId?: string): RTCSignaling {
  return {
    sendOffer: (sdp) => socketClient.emit("webrtc:offer", { targetUserId: peerUserId, sdp, callId }),
    sendAnswer: (sdp) => socketClient.emit("webrtc:answer", { targetUserId: peerUserId, sdp, callId }),
    sendIce: (candidate) => socketClient.emit("webrtc:ice", { targetUserId: peerUserId, candidate, callId }),
    onOffer: (cb) => subscribe("webrtc:offer", (p) => p.sdp, cb),
    onAnswer: (cb) => subscribe("webrtc:answer", (p) => p.sdp, cb),
    onIce: (cb) => subscribe("webrtc:ice", (p) => p.candidate, cb),
  };
}

/** Stranger-chat signaling — server routes to the current session partner. */
export function strangerSignaling(): RTCSignaling {
  return {
    sendOffer: (sdp) => socketClient.emit("stranger:webrtc-offer", { sdp }),
    sendAnswer: (sdp) => socketClient.emit("stranger:webrtc-answer", { sdp }),
    sendIce: (candidate) => socketClient.emit("stranger:webrtc-ice", { candidate }),
    onOffer: (cb) => subscribe("stranger:webrtc-offer", (p) => p.sdp, cb),
    onAnswer: (cb) => subscribe("stranger:webrtc-answer", (p) => p.sdp, cb),
    onIce: (cb) => subscribe("stranger:webrtc-ice", (p) => p.candidate, cb),
  };
}
