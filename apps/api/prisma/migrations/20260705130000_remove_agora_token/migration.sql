-- WebRTC migration: Agora removed. Drop the now-unused RTC token column.
ALTER TABLE "CallSession" DROP COLUMN IF EXISTS "agoraToken";
