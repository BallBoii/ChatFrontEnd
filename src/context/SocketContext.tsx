'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Message, toUIMessage, UIMessage } from '@/types/chat';
import { Sticker } from '@/types/sticker';
import { useEventNotifications } from '@/components/chat/useEventNotifications';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  messages: UIMessage[];
  joinRoom: (roomToken: string, sessionToken: string, nickname: string) => void;
  sendMessage: (content: string) => void;
  sendSticker: (sticker: Sticker) => void;
  sendImage: (attachments: Array<{ fileName: string; fileSize: number; mimeType: string; url: string }>, caption?: string) => void;
  sendFile: (attachments: Array<{ fileName: string; fileSize: number; mimeType: string; url: string }>, description?: string) => void;
  deleteMessage: (messageId: string) => void;
  leaveRoom: () => void;
  participantCount: number;
  nickname: string;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [nickname, setNickname] = useState('');
  const [roomToken, setRoomToken] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  const { success, info, warning, error } = useEventNotifications();
  
  // Use ref to store session data for socket event handlers
  const sessionRef = useRef<{ roomToken: string; sessionToken: string }>({
    roomToken: '',
    sessionToken: '',
  });

  // Update ref when state changes
  useEffect(() => {
    sessionRef.current = { roomToken, sessionToken };
  }, [roomToken, sessionToken]);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: false, // We'll connect manually when joining a room
      reconnection: false,
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setConnected(false);
    });

    // Backend event: room_joined - includes message history
    newSocket.on('room_joined', (data: { 
      roomToken: string; 
      participantCount: number;
      messages: Message[]; // Last 50 messages
    }) => {
      console.log('Room joined:', data);
      setParticipantCount(data.participantCount);
      
      // Load message history
      setNickname((currentNickname) => {
        const historyMessages = data.messages.map(msg => toUIMessage(msg, currentNickname));
        
        // Only replace messages if it's initial join, otherwise merge to avoid duplicates
        setMessages((prevMessages) => {
          if (prevMessages.length === 0) {
            // Initial join - load all history
            return historyMessages;
          } else {
            // Reconnecting - merge messages, avoiding duplicates
            const existingIds = new Set(prevMessages.map(m => m.id));
            const newMessages = historyMessages.filter(msg => !existingIds.has(msg.id));
            return [...prevMessages, ...newMessages];
          }
        });
        
        return currentNickname;
      });
      
      // Only show notification on initial join, not on reconnect
      setIsReconnecting((reconnecting) => {
        if (!reconnecting) {
          success('Joined room successfully!');
        }
        return false; // Reset reconnecting flag
      });
    });

    // Backend event: user_joined
    newSocket.on('user_joined', (data: { nickname: string; participantCount: number }) => {
      console.log('User joined:', data);
      setParticipantCount(data.participantCount);
      
      // Add system message
      const systemMessage: UIMessage = {
        id: `system-join-${data.nickname}-${Date.now()}`,
        type: 'TEXT',
        content: `${data.nickname} joined the room`,
        nickname: 'System',
        createdAt: new Date().toISOString(),
        attachments: [],
        isMine: false,
        isSystem: true,
      };
      
      // Check if we already have a recent join message for this user (within last 5 seconds)
      setMessages((prev) => {
        const fiveSecondsAgo = Date.now() - 5000;
        prev.some(m => 
          m.isSystem && 
          m.content === systemMessage.content &&
          new Date(m.createdAt).getTime() > fiveSecondsAgo
        );
        
        return [...prev, systemMessage];
      });
      
      info(`${data.nickname} joined the room`);
    });

    // Backend event: user_left
    newSocket.on('user_left', (data: { nickname: string; participantCount: number }) => {
      console.log('User left:', data);
      setParticipantCount(data.participantCount);
      
      // Add system message
      const systemMessage: UIMessage = {
        id: `system-left-${data.nickname}-${Date.now()}`,
        type: 'TEXT',
        content: `${data.nickname} left the room`,
        nickname: 'System',
        createdAt: new Date().toISOString(),
        attachments: [],
        isMine: false,
        isSystem: true,
      };
      
      // Check if we already have a recent leave message for this user (within last 5 seconds)
      setMessages((prev) => {
        const fiveSecondsAgo = Date.now() - 5000;
        prev.some(m => 
          m.isSystem && 
          m.content === systemMessage.content &&
          new Date(m.createdAt).getTime() > fiveSecondsAgo
        );
        
        return [...prev, systemMessage];
      });
      
      info(`${data.nickname} left the room`);
    });

    // Backend event: new_message
    newSocket.on('new_message', (message: Message) => {
      console.log('New message:', message);
      // Use the nickname from state
      setNickname((currentNickname) => {
        const uiMessage = toUIMessage(message, currentNickname);
        setMessages((prev) => {
          // Check if message already exists (prevent duplicates)
          if (prev.some(m => m.id === uiMessage.id)) {
            console.log('Message already exists, skipping:', uiMessage.id);
            return prev;
          }
          return [...prev, uiMessage];
        });
        return currentNickname;
      });
    });

    // Backend event: message_deleted
    newSocket.on('message_deleted', (data: { messageId: string }) => {
      console.log('Message deleted:', data);
      setMessages((prev) => prev.filter(m => m.id !== data.messageId));
      info('Message deleted');
    });

    // Backend event: room_ttl_warning
    newSocket.on('room_ttl_warning', (data: { expiresIn: number }) => {
      const minutes = Math.floor(data.expiresIn / 60);
      warning(`Room expires in ${minutes} minutes!`);
    });

    // Backend event: room_closed
    newSocket.on('room_closed', (data: { reason: string }) => {
      error(`Room closed: ${data.reason}`);
      setMessages([]);
      setParticipantCount(0);
    });

    // Backend event: error
    newSocket.on('error', (errorData: { message: string; code?: string }) => {
      console.error('Socket error:', errorData);
      error(errorData.message || 'An error occurred');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []); // Remove nickname dependency

  // Heartbeat to keep session alive
  useEffect(() => {
    if (!socket || !connected) return;

    const heartbeatInterval = setInterval(() => {
      socket.emit('heartbeat');
    }, 30000); // Every 30 seconds

    return () => clearInterval(heartbeatInterval);
  }, [socket, connected]);

  const joinRoom = useCallback((roomTkn: string, sessionTkn: string, nick: string) => {
    if (!socket) return;

    setRoomToken(roomTkn);
    setSessionToken(sessionTkn);
    setNickname(nick);
    setIsReconnecting(false);

    const doJoin = () => socket.emit('join_room', { roomToken: roomTkn, sessionToken: sessionTkn });

    if (socket.connected) {
      doJoin();
    } else {
      socket.once('connect', doJoin);
      socket.connect();
    }
  }, [socket]);


  const sendMessage = useCallback((content: string) => {
    if (!socket || !connected) {
      error('Not connected to server');
      return;
    }

    socket.emit('send_message', {
      type: 'TEXT',
      content,
    });
  }, [socket, connected]);

  const sendSticker = useCallback((sticker: Sticker) => {
    if (!socket || !connected) {
      error('Not connected to server');
      return;
    }

    socket.emit('send_message', {
      type: 'STICKER',
      content: sticker.id,
    });
  }, [socket, connected]);

  const sendImage = useCallback((
    attachments: Array<{ fileName: string; fileSize: number; mimeType: string; url: string }>,
    caption?: string
  ) => {
    if (!socket || !connected) {
      error('Not connected to server');
      return;
    }

    socket.emit('send_message', {
      type: 'IMAGE',
      content: caption || null,
      attachments,
    });
  }, [socket, connected]);

  const sendFile = useCallback((
    attachments: Array<{ fileName: string; fileSize: number; mimeType: string; url: string }>,
    description?: string
  ) => {
    if (!socket || !connected) {
      error('Not connected to server');
      return;
    }

    socket.emit('send_message', {
      type: 'FILE',
      content: description || null,
      attachments,
    });
  }, [socket, connected]);

  const deleteMessage = useCallback((messageId: string) => {
    if (!socket || !connected) {
      error('Not connected to server');
      return;
    }

    socket.emit('delete_message', { messageId });
  }, [socket, connected]);

  const leaveRoom = useCallback(() => {
    if (!socket) return;

    socket.emit('leave_room');
    socket.disconnect();
    setMessages([]);
    setParticipantCount(0);
    setRoomToken('');
    setSessionToken('');
    setNickname('');
  }, [socket]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        messages,
        joinRoom,
        sendMessage,
        sendSticker,
        sendImage,
        sendFile,
        deleteMessage,
        leaveRoom,
        participantCount,
        nickname,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
