export interface PublicRoomDTO {
  token: string;
  name?: string;
  participantCount: number;
  expiresAt: Date;
  createdAt: Date;
}
