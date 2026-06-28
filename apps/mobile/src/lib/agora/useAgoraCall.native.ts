/**
 * Agora call hook — NATIVE implementation (iOS/Android).
 * Fetches join credentials from the API, drives the RTC engine lifecycle,
 * and exposes imperative controls. Requires an EAS dev/production build.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  type IRtcEngine,
} from 'react-native-agora';
import { api } from '../api';
import type { AgoraCall, AgoraCallOptions } from './useAgoraCall';

async function ensurePermissions(video: boolean) {
  if (Platform.OS !== 'android') return;
  const perms = ['android.permission.RECORD_AUDIO'];
  if (video) perms.push('android.permission.CAMERA');
  try {
    await PermissionsAndroid.requestMultiple(perms as never);
  } catch {
    /* ignore */
  }
}

export function useAgoraCall({ callId, active, video }: AgoraCallOptions): AgoraCall {
  const engineRef = useRef<IRtcEngine | null>(null);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!active || !callId) return;
    let cancelled = false;

    (async () => {
      try {
        await ensurePermissions(video);

        const { data } = await api.get<{ appId: string | null; channelName: string; token: string }>(
          `/calls/${callId}/agora-token`,
        );
        if (cancelled || !data?.appId) return;

        const engine = createAgoraRtcEngine();
        engineRef.current = engine;
        engine.initialize({
          appId: data.appId,
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
        });
        engine.registerEventHandler({
          onJoinChannelSuccess: () => setJoined(true),
          onUserJoined: (_conn, uid) => setRemoteUid(uid),
          onUserOffline: () => setRemoteUid(null),
        });

        engine.enableAudio();
        if (video) {
          engine.enableVideo();
          engine.startPreview();
        }

        engine.joinChannel(data.token, data.channelName, 0, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          publishCameraTrack: video,
          autoSubscribeAudio: true,
          autoSubscribeVideo: video,
        });
      } catch {
        /* swallow — call screen shows fallback */
      }
    })();

    return () => {
      cancelled = true;
      const engine = engineRef.current;
      engineRef.current = null;
      try {
        engine?.leaveChannel();
        engine?.release();
      } catch {
        /* ignore */
      }
      setJoined(false);
      setRemoteUid(null);
    };
  }, [active, callId, video]);

  const setMuted = useCallback((muted: boolean) => {
    engineRef.current?.muteLocalAudioStream(muted);
  }, []);
  const setCameraOff = useCallback((off: boolean) => {
    engineRef.current?.muteLocalVideoStream(off);
  }, []);
  const setSpeaker = useCallback((on: boolean) => {
    engineRef.current?.setEnableSpeakerphone(on);
  }, []);
  const switchCamera = useCallback(() => {
    engineRef.current?.switchCamera();
  }, []);
  const leave = useCallback(() => {
    try {
      engineRef.current?.leaveChannel();
    } catch {
      /* ignore */
    }
  }, []);

  return { remoteUid, joined, setMuted, setCameraOff, setSpeaker, switchCamera, leave };
}
