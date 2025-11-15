'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Message, toUIMessage, UIMessage, Attachment } from '@/types/chat';
import { Sticker } from '@/types/sticker';
import { useEventNotifications } from '@/components/chat/useEventNotifications';
import { PublicRoomDTO } from '@/types/room';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  messages: UIMessage[];
  setUsername: (username: string) => void;
  getActiveUsers: () => void;
  getPublicRooms: () => void;
  publicRooms: PublicRoomDTO[];
  joinRoom: (roomToken: string, sessionToken: string, nickname: string) => void;
  sendMessage: (content: string) => void;
  sendSticker: (sticker: Sticker) => void;
  sendImage: (files: File[], caption?: string) => Promise<void>;
  sendFile: (files: File[], description?: string) => Promise<void>;
  deleteMessage: (messageId: string) => void;
  leaveRoom: () => void;
  disconnect: () => void;
  participantCount: number;
  participants: string[]; // List of all nicknames in the room
  nickname: string;
  uploading: boolean;
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
  const [participants, setParticipants] = useState<string[]>([]); // Track all participants
  const [publicRooms, setPublicRooms] = useState<PublicRoomDTO[]>([]);
  const [nickname, setNickname] = useState('');
  const [roomToken, setRoomToken] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Get notification functions
  const notifications = useEventNotifications();
  
  // Use ref to track if we should show join notification
  const shouldShowJoinNotification = useRef(true);
  
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
      autoConnect: false, // back to false since when we view the file we don't want it to connect
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

    newSocket.on('username_set', (data: { username: string }) => {
      console.log('Username set on server:', data.username);
      setNickname(data.username);
    });
  
    newSocket.on('active_users', (data: { users: string[] }) => {
      console.log('Active users received:', data.users);
      // Handle active users list if needed
    });

    newSocket.on('public_rooms_update', (data: { rooms: PublicRoomDTO[] }) => {
      console.log('Public rooms update received:', data.rooms);
      setPublicRooms(data.rooms);
    }); 

    // Backend event: room_joined - includes message history
    newSocket.on('room_joined', (data: { 
      roomToken: string; 
      participantCount: number;
      participants: string[]; // All nicknames in the room
      messages: Message[]; // Last 50 messages
    }) => {
      console.log('Room joined:', data);
      setParticipantCount(data.participantCount);
      setParticipants(data.participants || []); // Update participants list
      
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
      if (shouldShowJoinNotification.current && !isReconnecting) {
        // Use setTimeout to defer notification to after render
        setTimeout(() => {
          notifications.success('Joined room successfully!');
        }, 0);
        shouldShowJoinNotification.current = false; // Reset flag after showing notification
      }
      setIsReconnecting(false);
    });

    // Backend event: user_joined
    newSocket.on('user_joined', (data: { nickname: string; participantCount: number; participants: string[] }) => {
      console.log('User joined:', data);
      setParticipantCount(data.participantCount);
      setParticipants(data.participants || []); // Update participants list
      
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
        const isDuplicate = prev.some(m => 
          m.isSystem && 
          m.content === systemMessage.content &&
          new Date(m.createdAt).getTime() > fiveSecondsAgo
        );
        
        // Only add if not a duplicate
        if (isDuplicate) {
          return prev;
        }
        return [...prev, systemMessage];
      });
      
      // Use setTimeout to defer notification to after render
      setTimeout(() => {
        notifications.info(`${data.nickname} joined the room`);
      }, 0);
    });

    // Backend event: user_left
    newSocket.on('user_left', (data: { nickname: string; participantCount: number; participants: string[] }) => {
      console.log('User left:', data);
      setParticipantCount(data.participantCount);
      setParticipants(data.participants || []);
      
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
      
      setMessages((prev) => [...prev, systemMessage]);
      
      // Show notification
      setTimeout(() => {
        notifications.info(`${data.nickname} left the room`);
      }, 0);
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
      // Use setTimeout to defer notification to after render
      setTimeout(() => {
        notifications.info('Message deleted');
      }, 0);
    });

    // Backend event: room_ttl_warning
    newSocket.on('room_ttl_warning', (data: { expiresIn: number }) => {
      const minutes = Math.floor(data.expiresIn / 60);
      // Use setTimeout to defer notification to after render
      setTimeout(() => {
        notifications.warning(`Room expires in ${minutes} minutes!`);
      }, 0);
    });

    // Backend event: room_closed
    newSocket.on('room_closed', (data: { reason: string }) => {
      // Use setTimeout to defer notification to after render
      setTimeout(() => {
        notifications.error(`Room closed: ${data.reason}`);
      }, 0);
      setMessages([]);
      setParticipantCount(0);
      setParticipants([]); // Clear participants list
    });

    // Backend event: error
    newSocket.on('error', (errorData: { message: string; code?: string }) => {
      console.error('Socket error:', errorData);
      // Use setTimeout to defer notification to after render
      setTimeout(() => {
        notifications.error(errorData.message || 'An error occurred');
      }, 0);
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

  // Handle page close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socket && roomToken && sessionToken) {
        socket.emit('leave_room');
        socket.disconnect();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [socket, roomToken, sessionToken]);

  const setUsername = useCallback((username: string) => {
    if (!socket) return;

    if(!socket.connected)
      socket.connect();

    socket.emit('set_username', { username });
  }, [socket]);

  const getActiveUsers = useCallback(() => {
    if (!socket) return;
    socket.emit('get_active_users');
  }, [socket]);

  const getPublicRooms = useCallback(() => {
    if (!socket) return;
    console.log('Requesting public rooms...');
    socket.emit('get_public_rooms');
  }, [socket]);

  const joinRoom = useCallback((roomTkn: string, sessionTkn: string, nick: string) => {
    if (!socket) return;

    setRoomToken(roomTkn);
    setSessionToken(sessionTkn);
    setNickname(nick);
    setIsReconnecting(false);
    shouldShowJoinNotification.current = true;

    if(!socket.connected) // just ensure connection
      socket.connect();

    socket.emit('join_room', { roomToken: roomTkn, sessionToken: sessionTkn });

  }, [socket]);


  const sendMessage = useCallback((content: string) => {
    if (!socket || !connected) {
      notifications.error('Not connected to server');
      return;
    }

    socket.emit('send_message', {
      type: 'TEXT',
      content,
    });
  }, [socket, connected, notifications]);

  const sendSticker = useCallback((sticker: Sticker) => {
    if (!socket || !connected) {
      notifications.error('Not connected to server');
      return;
    }

    socket.emit('send_message', {
      type: 'STICKER',
      content: sticker.id,
    });
  }, [socket, connected, notifications]);
  
  const uploadFiles = async (files: File[]): Promise<Attachment[]> => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
    
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        console.log('Uploading file:', file.name, file.size, file.type);
        
        const response = await fetch(`${baseUrl}/api/files/upload`, {
          method: 'POST',
          body: formData,
        });
        
        console.log('Upload response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Upload error response:', errorText);
          throw new Error(`Upload failed for ${file.name}: ${response.status} ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Upload result:', result);
        return result.attachment as Attachment;
      });
      
      return await Promise.all(uploadPromises);
    } catch (err) {
      console.error('File upload error:', err);
      throw err;
    }
  };
  
  const sendImage = useCallback(async (files: File[], caption?: string) => {
    if (!socket || !connected) {
      notifications.error('Not connected to server');
      return;
    }

    setUploading(true);
    try {
      // Upload files to backend first
      const attachments = await uploadFiles(files);
      
      // Send message with attachment data via WebSocket
      socket.emit('send_message', {
        type: 'IMAGE',
        content: caption || null,
        attachments: attachments, // Send attachment data, not file data
      });
      
      notifications.success(`Sent ${files.length} image(s)`);
    } catch (err) {
      console.error('Image send error:', err);
      notifications.error('Failed to send images');
    } finally {
      setUploading(false);
    }
  }, [socket, connected, notifications]);


  const sendFile = useCallback(async (files: File[], description?: string) => {
    if (!socket || !connected) {
      notifications.error('Not connected to server');
      return;
    }

    setUploading(true);
    try {
      // Upload files first
      const attachments = await uploadFiles(files);
      
      // Then send message with attachments via WebSocket
      socket.emit('send_message', {
        type: 'FILE',
        content: description || null,
        attachments: attachments, // Send the full attachment objects, same as sendImage
      });
      
      notifications.success(`Sent ${files.length} file(s)`);
    } catch (err) {
      console.error('File send error:', err);
      notifications.error('Failed to send files');
    } finally {
      setUploading(false);
    }
  }, [socket, connected, notifications]);

  const deleteMessage = useCallback((messageId: string) => {
    if (!socket || !connected) {
      notifications.error('Not connected to server');
      return;
    }

    socket.emit('delete_message', { messageId });
  }, [socket, connected, notifications]);

  const leaveRoom = useCallback(() => {
    if (!socket) return;

    socket.emit('leave_room');
    setMessages([]);
    setParticipantCount(0);
    setParticipants([]); // Clear participants list
    setRoomToken('');
    setSessionToken('');
  }, [socket]);

  const disconnect = useCallback(() => {
    if (!socket) return;

    if (roomToken) {
      socket.emit('leave_room');
    }

    socket.disconnect();

    setMessages([]);
    setParticipantCount(0);
    setParticipants([]);
    setRoomToken('');
    setSessionToken('');
    setNickname('');
  }, [socket, roomToken]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        messages,
        setUsername,
        getActiveUsers,
        getPublicRooms,
        publicRooms,
        joinRoom,
        sendMessage,
        sendSticker,
        sendImage,
        sendFile,
        deleteMessage,
        leaveRoom,
        disconnect,
        participantCount,
        participants, // Add participants to context
        nickname,
        uploading
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
