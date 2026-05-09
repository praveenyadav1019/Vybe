/** Shared API + client types for VYBEON */

// ─── Enums / Literals ────────────────────────────────────────────────────────

export type DistanceBucket = "same_place" | "under_100m" | "nearby" | "unknown";

export type MatchRequestStatus = "pending" | "accepted" | "rejected";

export type CallType = "audio" | "video";

export type CallStatus = "ringing" | "active" | "ended";

export type VerificationStatus = "none" | "pending" | "verified" | "rejected";

export type AppMode =
  | "dating"
  | "hook"
  | "co_travel"
  | "night_out"
  | "club_mates"
  | "happening";

export type Gender = "male" | "female" | "non_binary" | "fluid" | "prefer_not_to_say";

export type MessageType = "text" | "image" | "audio" | "video";

export type PlaceCategory = "club" | "bar" | "lounge" | "rooftop" | "restaurant";

export type SubscriptionPlan = "free" | "vybeon_plus" | "vybeon_gold";

export type ReportReason =
  | "harassment"
  | "fake-profile"
  | "inappropriate-content"
  | "spam"
  | "underage"
  | "other";

// ─── Core Domain Types ───────────────────────────────────────────────────────

export interface NearbyUser {
  id: string;
  name: string;
  age?: number;
  photoUrl?: string;
  verified: boolean;
  distanceBucket: DistanceBucket;
  /** Venue label when user opted into venue presence */
  venueLabel?: string;
  /** Active app mode of this user */
  mode?: AppMode;
  interests: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  isNewUser: boolean;
}

export interface ProfileSummary {
  id: string;
  userId: string;
  name: string;
  age?: number;
  gender?: string;
  bio?: string;
  interests: string[];
  photos: string[];
  verified: boolean;
  mode?: AppMode;
}

export interface PlaceSummary {
  id: string;
  name: string;
  category: string;
  activeUsers: number;
  vibeScore: number;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface ChatSummary {
  id: string;
  title: string;
  peerPhotoUrl?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  updatedAt: string;
  peerId: string;
  unreadCount: number;
}

export interface MessageDTO {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  readAt?: string;
  createdAt: string;
}

export interface CallSessionDTO {
  id: string;
  type: CallType;
  status: CallStatus;
  fromUserId: string;
  toUserId: string;
  channelName?: string;
  agoraToken?: string;
  startedAt?: string;
  duration?: number;
}

export interface PingDTO {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: MatchRequestStatus;
  message?: string;
  createdAt: string;
}

// ─── API Response Wrappers ───────────────────────────────────────────────────

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── WebRTC / Agora ──────────────────────────────────────────────────────────

export interface WebRTCProvider {
  readonly name: string;
  joinChannel(channelId: string, token: string): Promise<void>;
  leaveChannel(): Promise<void>;
}

// ─── Socket Event Maps ───────────────────────────────────────────────────────

export type SocketClientEvent =
  | "user:online"
  | "location:update"
  | "nearby:subscribe"
  | "message:send"
  | "typing:start"
  | "typing:stop"
  | "call:request"
  | "call:accept"
  | "call:reject"
  | "call:end"
  | "webrtc:offer"
  | "webrtc:answer"
  | "webrtc:ice";

export type SocketServerEvent =
  | "nearby:update"
  | "ping:received"
  | "message:new"
  | "typing:update"
  | "call:incoming"
  | "call:accepted"
  | "call:rejected"
  | "call:ended"
  | "match:new";

// ─── Socket Payload Types ────────────────────────────────────────────────────

export interface LocationUpdatePayload {
  lat: number;
  lng: number;
}

export interface MessageSendPayload {
  chatId: string;
  content: string;
  type?: MessageType;
}

export interface TypingPayload {
  chatId: string;
}

export interface CallRequestPayload {
  targetUserId: string;
  type: CallType;
}

export interface CallActionPayload {
  callId: string;
}

export interface WebRTCOfferPayload {
  targetUserId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface WebRTCAnswerPayload {
  targetUserId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface WebRTCIcePayload {
  targetUserId: string;
  candidate: RTCIceCandidateInit;
}

export interface NearbyUpdatePayload {
  users: NearbyUser[];
}

export interface PingReceivedPayload {
  id: string;
  fromUserId: string;
  status?: MatchRequestStatus;
  chatId?: string;
}

export interface CallIncomingPayload {
  id: string;
  type: CallType;
  fromUserId: string;
  fromName?: string;
  fromPhoto?: string;
}

export interface TypingUpdatePayload {
  chatId: string;
  userId: string;
  isTyping: boolean;
}
