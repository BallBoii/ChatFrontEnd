// Core entities
export interface Ghost {
  id: string;        // ephemeral member id from server
  nickname: string;  // room-scoped
}

// Room info from backend
export interface Room {
  token: string;
  name?: string;
  isPublic?: boolean;
  expiresAt: string;
  participantCount: number;
  createdAt: string;
}

// Session after joining
export interface Session {
  sessionToken: string;
  nickname: string;
  roomToken: string;
}

// export interface MessageData {
//   id: string;
//   content: string;
//   sender: string;
//   timestamp: string;
//   isMine: boolean;
//   isSystem?: boolean;
//   type: 'text' | 'sticker';
//   stickerUrl?: string;
//   stickerId?: string;
// }

// export interface Member {
//   id: string;
//   nickname: string;
//   isOnline: boolean;
// }


// Core entities
export interface Ghost {
  id: string;        // ephemeral member id from server
  nickname: string;  // room-scoped
}

export interface Member {
  nickname: string;
  participantCount?: number;
}

// ---- Message model (matches backend API) ----
type MessageBase = {
  id: string;
  createdAt: string;       // ISO date string from backend
  nickname: string;        // sender nickname
};

// TEXT
export type TextMessage = MessageBase & {
  type: 'TEXT';
  content: string;
  attachments: [];
};

// STICKER
export type StickerMessage = MessageBase & {
  type: 'STICKER';
  content: string;         // sticker ID
  attachments: [];
};

// IMAGE / FILE
export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
}

export type ImageMessage = MessageBase & {
  type: 'IMAGE';
  content: string | null;  // optional caption
  attachments: Attachment[];
};

export type FileMessage = MessageBase & {
  type: 'FILE';
  content: string | null;  // optional description
  attachments: Attachment[];
};

// Discriminated union
export type Message = TextMessage | StickerMessage | ImageMessage | FileMessage;

// ---- UI helpers (derived) ----
export type UIMessage = Message & { 
  isMine: boolean;
  isSystem?: boolean; // For client-side system messages (join/leave notifications)
};

export const isMine = (m: Message, myNickname: string) =>
  m.nickname === myNickname;

export const toUIMessage = (m: Message, myNickname: string): UIMessage => ({
  ...m,
  isMine: isMine(m, myNickname),
});