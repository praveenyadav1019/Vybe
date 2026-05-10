import type { WebRTCProvider } from "../types";

/** Placeholder until Agora/Twilio adapter ships. */
export class NoopWebRTCProvider implements WebRTCProvider {
  readonly name = "noop";
  async joinChannel(_channelId: string, _token: string) {}
  async leaveChannel() {}
}
