'use client';

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UserSetupModal } from "@/components/chat/UserSetupModal";
import { RoomBrowser } from "@/components/chat/RoomBrowser";
import { TopBar } from "@/components/chat/TopBar";
import { MembersPanel } from "@/components/chat/MembersPanel";
import { MessageList } from "@/components/chat/MessageList";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { MobileNav } from "@/components/chat/MobileNav";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { CuteBackground } from "@/components/chat/CuteBackground";
import { ActiveUsersPanel } from "@/components/chat/ActiveUsersPanel";
import { Users, Settings as SettingsIcon, LogOut, Copy, MessageCircle, DoorOpen, Sun, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEventNotifications } from "@/components/chat/useEventNotifications";
import { useSocket } from "@/context/SocketContext";
import { roomService } from "@/lib/services/roomService";
import { preloadStickerMap } from "@/lib/utils/stickerMap";
import type { Sticker } from "@/types/sticker";
import type { Session } from "@/types/chat";
import { GhostLogo } from "@/components/chat/GhostLogo";

export default function App() {
  const [usernameSet, setUsernameSet] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [timeLeft, setTimeLeft] = useState("59:45");
  const [mobileTab, setMobileTab] = useState<"users" | "rooms" | "chat" | "members" | "settings">("users");
  const [desktopTab, setDesktopTab] = useState<"users" | "rooms">("users");
  const [darkMode, setDarkMode] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const { messages, joinRoom, sendMessage, sendImage, sendFile, sendSticker, leaveRoom, participantCount, participants, nickname } = useSocket();
  const { success, error } = useEventNotifications();

  // Preload sticker map on app mount
  useEffect(() => {
    preloadStickerMap().catch(err => {
      console.error('Failed to preload sticker map:', err);
    });
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Calculate time left based on expiresAt
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = Math.max(0, expiry - now);
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        setTimeLeft(`${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
      } else {
        setTimeLeft(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleUsernameSet = () => {
    setUsernameSet(true);
  };

  const handleJoin = async (joinedSession: Session) => {
    try {
      setSession(joinedSession);
      
      // Get room info to get expiration time
      const roomInfo = await roomService.getRoomInfo(joinedSession.roomToken);
      setExpiresAt(roomInfo.expiresAt);
      
      // Join via WebSocket
      joinRoom(joinedSession.roomToken, joinedSession.sessionToken, joinedSession.nickname);
      
      // Switch to chat tab
      setMobileTab("chat");
    } catch (err) {
      console.error('Failed to complete join:', err);
      error('Failed to join room');
    }
  };

  const handleSendMessage = (content: string) => {
    if (!session) return;
    sendMessage(content);
  };

  const handleSendSticker = (sticker: Sticker) => {
    if (!session) return;
    sendSticker(sticker);
  };

  const handleSendFile = async (files: File[], type: 'IMAGE' | 'FILE', caption?: string) => {
    if (type === 'IMAGE') {
      await sendImage(files, caption);
    } else {
      await sendFile(files, caption);
    }
  };

  const handleLogout = () => {
    if (session) {
      leaveRoom();
      setSession(null);
      setExpiresAt(null);
    }
    setMobileTab("users");
    setDesktopTab("users");
  };

  const handleCopyToken = () => {
    if(!session) return;
    navigator.clipboard.writeText(session.roomToken);
    success("Token copied to clipboard");
  };

  // Step 1: Show username modal if username not set
  if (!usernameSet) {
    return (
      <>
        <div className="size-full flex items-center justify-center">
          <CuteBackground />
        </div>
        <UserSetupModal open={true} onUsernameSet={handleUsernameSet} />
      </>
    );
  }

  // Step 2: Show main menu with users/rooms tabs (not in a room yet)
  if (!session) {
    return (
      <div className="size-full flex items-center justify-center p-4">
        <CuteBackground />
        
        <Dialog open={true} modal>
          <DialogContent className="sm:max-w-md border-border bg-card shadow-2xl" hideClose>
            <DialogHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-primary">
                    <GhostLogo size={28} />
                  </div>
                  <div>
                    <DialogTitle className="text-lg">GhostRooms</DialogTitle>
                    <DialogDescription className="text-xs">
                      Welcome, {nickname}
                    </DialogDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="hidden md:flex h-8 w-8 p-0 rounded-full border-border items-center justify-center transition-colors cursor-pointer bg-muted group flex-shrink-0"
                  onClick={()=> setDarkMode(!darkMode) }
                >
                  {darkMode ? (
                    <Moon className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <Sun className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                  )}
                </Badge>
              </div>
            </DialogHeader>

            {/* Tab Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant={desktopTab === "users" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDesktopTab("users")}
                className="rounded-lg flex-1"
              >
                <Users className="h-4 w-4 mr-2" />
                Users
              </Button>
              <Button
                variant={desktopTab === "rooms" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDesktopTab("rooms")}
                className="rounded-lg flex-1"
              >
                <DoorOpen className="h-4 w-4 mr-2" />
                Rooms
              </Button>
            </div>

            {/* Content - Fixed Height with Scroll */}
            <div className="h-[450px] overflow-y-auto -mx-6">
              {desktopTab === "users" && <ActiveUsersPanel currentNickname={nickname} />}
              {desktopTab === "rooms" && <RoomBrowser nickname={nickname} onJoin={handleJoin} />}
            </div>

            {/* Decorative Background Blobs */}
            <div className="absolute inset-0 -z-10 overflow-hidden rounded-lg pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl" />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Step 3: User is in a room - show chat interface
  return (
    <div className="size-full flex items-center justify-center p-4 lg:p-6">
      <CuteBackground />
      
      {/* Desktop & Tablet: Floating Window */}
      <div className="hidden md:flex w-full h-full items-center justify-center relative z-10">
        <ChatWindow>
          <TopBar token={session.roomToken} timeLeft={timeLeft} darkMode={darkMode} setDarkMode={setDarkMode} onLeave={handleLogout} />
          
          <div className="flex-1 flex overflow-hidden">
            <MembersPanel participantCount={participantCount} participants={participants} currentNickname={session.nickname} />
            
            <div className="flex-1 flex flex-col">
              <MessageList messages={messages} />
              <MessageComposer 
                onSend={handleSendMessage} 
                onStickerSend={handleSendSticker}
                onFileSend={handleSendFile}
              />
            </div>
          </div>
        </ChatWindow>
      </div>

      {/* Mobile: Fullscreen */}
      <div className="md:hidden flex flex-col fixed inset-0 z-10 pb-20">
        <div className="w-full h-full p-5 sm:p-6 flex items-center justify-center">
          <div className="flex flex-col w-full h-full rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-border/50 backdrop-blur-sm bg-card/95">
            <TopBar token={session.roomToken} timeLeft={timeLeft} darkMode={darkMode} setDarkMode={setDarkMode} onLeave={handleLogout} />

            <div className="flex-1 flex overflow-hidden pb-5">
              <div className={`flex-1 flex flex-col ${mobileTab === "chat" ? "flex" : "hidden"}`}>
                <MessageList messages={messages} />
                <MessageComposer 
                  onSend={handleSendMessage} 
                  onStickerSend={handleSendSticker}  
                  onFileSend={handleSendFile}
                />
              </div>

              {mobileTab === "members" && (
                <div className="flex-1 flex flex-col bg-card overflow-hidden">
                  <div className="h-16 px-4 flex items-center gap-2 border-b border-border">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Members ({participantCount})</span>
                  </div>
                  <div className="flex-1 overflow-auto p-3 space-y-1">
                    {participants.map((participant, index) => {
                      const isCurrentUser = participant === session.nickname;
                      return (
                        <div 
                          key={`${participant}-${index}`}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                            isCurrentUser ? 'bg-muted/50' : 'hover:bg-muted/30'
                          }`}
                        >
                          <div className="relative">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isCurrentUser 
                                ? 'bg-gradient-to-br from-primary/20 to-secondary/20'
                                : 'bg-gradient-to-br from-muted to-muted-foreground/10'
                            }`}>
                              <span className="text-sm font-medium">
                                {participant.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card"></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm truncate font-medium">{participant}</p>
                              {isCurrentUser && <span className="text-xs text-muted-foreground">(you)</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {mobileTab === "settings" && (
                <div className="flex-1 flex flex-col bg-card overflow-hidden">
                  <div className="h-16 px-4 flex items-center gap-2 border-b border-border">
                    <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Settings</span>
                  </div>
                  <div className="flex-1 overflow-auto p-4 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3">
                        <div className="space-y-0.5">
                          <Label htmlFor="dark-mode">Dark Mode</Label>
                          <p className="text-sm text-muted-foreground">Toggle dark theme</p>
                        </div>
                        <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
                      </div>
                      <div className="pt-4 border-t border-border">
                        <div className="space-y-2">
                          <Label>Current Session</Label>
                          <p className="text-sm text-muted-foreground">
                            Logged in as <span className="text-foreground">{session.nickname}</span>
                          </p>
                          <p className="text-sm text-muted-foreground break-words">
                            Room: <code className="text-foreground cursor-pointer inline-flex items-center gap-1" onClick={handleCopyToken}>
                              {session.roomToken} <Copy className="h-3 w-3" />
                            </code>
                          </p>
                        </div>
                      </div>
                      <Button onClick={handleLogout} variant="destructive" className="w-full rounded-xl h-11">
                        <LogOut className="h-4 w-4 mr-2" /> Leave Room
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MobileNav activeTab={mobileTab} onTabChange={setMobileTab} />
    </div>
  );
}