import { io, type Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEYS } from './api';

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

class SocketClient {
  private socket: Socket | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.socket?.connected) return;

    const token = await SecureStore.getItemAsync(TOKEN_KEYS.ACCESS);
    if (!token) throw new Error('No auth token');

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    return new Promise((resolve, reject) => {
      this.socket!.on('connect', () => {
        this.isConnected = true;
        resolve();
      });
      this.socket!.on('connect_error', (err) => {
        reject(err);
      });
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected = false;
  }

  emit(event: string, data?: unknown) {
    if (!this.socket?.connected) {
      console.warn(`[Socket] not connected — cannot emit "${event}"`);
      return;
    }
    this.socket.emit(event, data);
  }

  on(event: string, handler: (...args: unknown[]) => void) {
    this.socket?.on(event, handler);
  }

  off(event: string, handler?: (...args: unknown[]) => void) {
    this.socket?.off(event, handler);
  }

  get connected() {
    return this.isConnected && (this.socket?.connected ?? false);
  }
}

export const socketClient = new SocketClient();

// ─── Legacy helpers (kept for backward-compat) ──────────────────────────────

export function getSocket(token: string | null): Socket | null {
  if (!token) return null;
  return (socketClient as unknown as { socket: Socket | null }).socket;
}

export function disconnectSocket() {
  socketClient.disconnect();
}
