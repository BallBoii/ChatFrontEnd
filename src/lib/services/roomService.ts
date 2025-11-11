import { ghostAPI } from "@/lib/api";
import type { Room, Session } from "@/types/chat";

export const roomService = {
  /**
   * Create a new ghost room
   */
  async createRoom(ttlHours: number = 24, name?: string, isPublic: boolean = false) {
    return await ghostAPI.createRoom(ttlHours, name, isPublic);
  },

  /**
   * Validate if a room exists and is active
   */
  async validateRoom(roomToken: string): Promise<boolean> {
    return await ghostAPI.validateRoom(roomToken);
  },

  /**
   * Get room details
   */
  async getRoomInfo(roomToken: string): Promise<Room> {
    return await ghostAPI.getRoomInfo(roomToken);
  },

  /**
   * Join a room with a nickname
   */
  async joinRoom(roomToken: string, nickname: string): Promise<Session> {
    return await ghostAPI.joinRoom(roomToken, nickname);
  },

  /**
   * Get messages from a room
   */
  async getMessages(roomToken: string, sessionToken: string, limit: number = 50) {
    return await ghostAPI.getMessages(roomToken, sessionToken, { limit });
  },

  /**
   * Get all public rooms
   */
  async getPublicRooms() {
    return await ghostAPI.getPublicRooms();
  },
};
