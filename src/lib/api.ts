import axios, { AxiosError, AxiosInstance } from "axios";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", Accept: "application/json", ...(init?.headers||{}) },
    credentials: "include", // ถ้าแบ็กเอนด์ใช้ cookie
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface ApiEnvelope<T = unknown> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: { code?: string; message?: string; details?: unknown };
}

export class ApiClientError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
  constructor(message: string, opts: { status?: number; code?: string; details?: unknown } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
  }
}

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_API_URL,      
  headers: { "Content-Type": "application/json" },
  // timeout: 15000,                                   // optional: add a timeout
  // withCredentials: true,                            // optional: set default if you always need cookies
});

// Optional: attach auth header if you use tokens
// apiClient.interceptors.request.use((config) => {
//   const token = getTokenSomehow();
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

apiClient.interceptors.response.use(
  (response) => {
    const payload = response.data;
    // Unwrap only if it *looks* like your envelope
    const looksLikeEnvelope =
      payload && typeof payload === "object" && ("data" in payload || "success" in payload || "message" in payload);

    return looksLikeEnvelope && (payload as ApiEnvelope).data !== undefined
      ? (payload as ApiEnvelope).data
      : payload;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    const payload = error.response?.data as ApiEnvelope | unknown;

    const code =
      (typeof payload === "object" && payload && "error" in payload && (payload as any).error?.code) ||
      (typeof payload === "object" && payload && "code" in payload && (payload as any).code) ||
      error.code;

    const message =
      (typeof payload === "object" && payload && "error" in payload && (payload as any).error?.message) ||
      (typeof payload === "object" && payload && "message" in payload && (payload as any).message) ||
      error.message ||
      "Request failed";

    const details =
      (typeof payload === "object" && payload && "error" in payload && (payload as any).error?.details) || payload;

    return Promise.reject(new ApiClientError(String(message), { status, code, details }));
  }
);

export { apiClient };

// ============================================
// GhostRooms API Functions
// ============================================

import type { Room, Session, Message } from '@/types/chat';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

interface CreateRoomResponse {
  success: boolean;
  data: {
    token: string;
    name?: string;
    expiresAt: string;
  };
}

interface PublicRoomsResponse {
  success: boolean;
  data: {
    token: string;
    name?: string;
    participantCount: number;
    expiresAt: string;
    createdAt: string;
  }[];
}

interface JoinRoomResponse {
  success: boolean;
  data: Session;
}

interface RoomInfoResponse {
  success: boolean;
  data: Room;
}

interface MessagesResponse {
  success: boolean;
  data: Message[];
}

export const ghostAPI = {
  /**
   * Create a new chat room
   */
  async createRoom(ttlHours: number = 24, name?: string, isPublic: boolean = false): Promise<{ token: string; name?: string; expiresAt: string }> {
    const res = await fetch(`${BASE_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttlHours, name, isPublic }),
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || `Failed to create room: ${res.status}`);
    }
    
    const json: CreateRoomResponse = await res.json();
    return json.data;
  },

  /**
   * Get room information
   */
  async getRoomInfo(roomToken: string): Promise<Room> {
    const res = await fetch(`${BASE_URL}/api/rooms/${roomToken}`);
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || `Failed to get room info: ${res.status}`);
    }
    
    const json: RoomInfoResponse = await res.json();
    return json.data;
  },

  /**
   * Validate if a room token is valid
   */
  async validateRoom(roomToken: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/api/rooms/${roomToken}/validate`);
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Join a room with a nickname
   */
  async joinRoom(roomToken: string, nickname: string): Promise<Session> {
    const res = await fetch(`${BASE_URL}/api/rooms/${roomToken}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || `Failed to join room: ${res.status}`);
    }
    
    const json: JoinRoomResponse = await res.json();
    return json.data;
  },

  /**
   * Get messages from a room
   */
  async getMessages(
    roomToken: string, 
    sessionToken: string,
    options?: { limit?: number; before?: string }
  ): Promise<Message[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.before) params.set('before', options.before);
    
    const url = `${BASE_URL}/api/messages/${roomToken}${params.toString() ? '?' + params.toString() : ''}`;
    
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || `Failed to get messages: ${res.status}`);
    }
    
    const json: MessagesResponse = await res.json();
    return json.data;
  },

  /**
   * Get all public rooms
   */
  async getPublicRooms(): Promise<Array<{ token: string; name?: string; participantCount: number; expiresAt: string; createdAt: string }>> {
    const res = await fetch(`${BASE_URL}/api/rooms/public`);
    
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || `Failed to get public rooms: ${res.status}`);
    }
    
    const json: PublicRoomsResponse = await res.json();
    return json.data;
  },
};
