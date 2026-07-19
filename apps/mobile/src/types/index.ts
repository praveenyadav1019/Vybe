export type Mode = 'dating' | 'hook' | 'co-travel' | 'night-out' | 'club-mates' | 'casual' | 'happening';
export type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
export type Distance = 'Same venue' | 'Within 100m' | 'Nearby';
export type Privacy = 'public' | 'verified-only' | 'private';
export type CallType = 'audio' | 'video';
export type MessageType = 'text' | 'image' | 'audio' | 'video';
export type PlaceType = 'club' | 'bar' | 'lounge' | 'rooftop' | 'restaurant';

export interface User {
  id: string;
  phone: string;
  name: string;
  age: number;
  gender: Gender;
  bio?: string;
  photos: string[];
  interests: string[];
  isVerified: boolean;
  isPremium: boolean;
  activeMode: Mode;
  isOnline: boolean;
  lastSeen: string;
  safetyMode: boolean;
  privacyLevel: Privacy;
  createdAt: string;
}

export interface NearbyUser {
  id: string;
  name: string;
  age: number;
  photos: string[];
  distance: Distance;
  activeMode: Mode;
  isVerified: boolean;
  isOnline: boolean;
  interests: string[];
}

export interface Chat {
  id: string;
  otherUser: Pick<User, 'id' | 'name' | 'photos' | 'isOnline' | 'isVerified'>;
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  readAt?: string;
  createdAt: string;
}

export interface Place {
  id: string;
  name: string;
  type: PlaceType;
  description?: string;
  address: string;
  vibeScore: number;
  crowdScore: number;
  activeUsers: number;
  isHappening: boolean;
  photos: string[];
  distance: string;
  tags: string[];
}

export interface MatchRequest {
  id: string;
  fromUser: Pick<User, 'id' | 'name' | 'age' | 'photos' | 'isVerified'>;
  message?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'match_request' | 'match_accepted' | 'message' | 'call' | 'nearby' | 'safety';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface CallSession {
  id: string;
  initiatorId: string;
  receiverId: string;
  type: CallType;
  status: 'pending' | 'accepted' | 'rejected' | 'active' | 'ended';
  channelName?: string;
}
