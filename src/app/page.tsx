'use client';

import { useState, useEffect } from "react";
import { CreateJoinModal } from "@/components/chat/CreateJoinModal";
import { TopBar } from "@/components/chat/TopBar";
import { MembersPanel } from "@/components/chat/MembersPanel";
import { MessageList } from "@/components/chat/MessageList";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { MobileNav } from "@/components/chat/MobileNav";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { CuteBackground } from "@/components/chat/CuteBackground";
import { Users, Settings as SettingsIcon, LogOut, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEventNotifications } from "@/components/chat/useEventNotifications";
import { useSocket } from "@/context/SocketContext";
import { roomService } from "@/lib/services/roomService";
import type { Sticker } from "@/types/sticker";
import type { Session } from "@/types/chat";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [timeLeft, setTimeLeft] = useState("59:45");
  const [mobileTab, setMobileTab] = useState<"chat" | "members" | "settings">("chat");
  const [darkMode, setDarkMode] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const { messages, joinRoom, sendMessage, sendImage, sendFile, sendSticker, leaveRoom, participantCount, participants, uploading } = useSocket();
  const { success, error } = useEventNotifications();

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

  const handleJoin = async (joinedSession: Session) => {
    try {
      setSession(joinedSession);
      
      // Get room info to get expiration time
      const roomInfo = await roomService.getRoomInfo(joinedSession.roomToken);
      setExpiresAt(roomInfo.expiresAt);
      
      // Join via WebSocket
      joinRoom(joinedSession.roomToken, joinedSession.sessionToken, joinedSession.nickname);
      
      // Load message history
      const history = await roomService.getMessages(joinedSession.roomToken, joinedSession.sessionToken, 50);
      // Messages from backend are already in UIMessage format via SocketContext
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
    leaveRoom();
    setSession(null);
    setExpiresAt(null);
    setMobileTab("chat");
  };

  const handleCopyToken = () => {
    if(!session) return;

    navigator.clipboard.writeText(session.roomToken);
    success("Token copied to clipboard");
  };

  if (!session) {
    return (
      <>
        <div className="size-full flex items-center justify-center">
          <CuteBackground />
        </div>
        <CreateJoinModal open={true} onJoin={handleJoin} />
      </>
    );
  }

  return (
    <div className="size-full flex items-center justify-center p-4 lg:p-6">
      <CuteBackground />
      
      {/* Desktop & Tablet: Floating Window */}
      <div className="hidden md:flex w-full h-full items-center justify-center relative z-10">
        <ChatWindow>
          <TopBar token={session.roomToken} timeLeft={timeLeft} darkMode={darkMode} setDarkMode={setDarkMode} />
          
          <div className="flex-1 flex overflow-hidden">
            <MembersPanel participantCount={participantCount} participants={participants} currentNickname={session.nickname} />
            
            <div className="flex-1 flex flex-col">
              <MessageList messages={messages} />
              <MessageComposer 
                onSend={handleSendMessage} 
                onStickerSend={handleSendSticker}
                onFileSend={handleSendFile}
                // disabled={uploading}
              />
            </div>
          </div>
        </ChatWindow>
      </div>

      {/* Mobile: Fullscreen */}
      <div className="md:hidden flex flex-col fixed inset-0 z-10 pb-20">
        <div className="w-full h-full p-5 sm:p-6 flex items-center justify-center">
          <div className="flex flex-col w-full h-full rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-border/50 backdrop-blur-sm bg-card/95">
            <TopBar token={session.roomToken} timeLeft={timeLeft} darkMode={darkMode} setDarkMode={setDarkMode} />

            <div className="flex-1 flex overflow-hidden pb-5">
              {/* Main Chat Area */}
              <div className={`flex-1 flex flex-col ${mobileTab === "chat" ? "flex" : "hidden"}`}>
                <MessageList messages={messages} />
                <MessageComposer 
                  onSend={handleSendMessage} 
                  onStickerSend={handleSendSticker}  
                  onFileSend={handleSendFile}
                  // disabled={uploading}
                />
              </div>

          {/* Mobile Members Panel */}
          {mobileTab === "members" && (
            <div className="flex-1 flex flex-col bg-card overflow-hidden">
              <div className="h-16 px-4 flex items-center gap-2 border-b border-border">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Members ({participantCount})</span>
              </div>
              <div className="flex-1 overflow-auto p-3 space-y-1">
                {/* Show all participants */}
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
                        {/* Online indicator */}
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm truncate font-medium">
                            {participant}
                          </p>
                          {isCurrentUser && (
                            <span className="text-xs text-muted-foreground">(you)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Fallback if participants list is empty but count > 0 */}
                {participants.length === 0 && participantCount > 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                    {participantCount} {participantCount === 1 ? 'ghost' : 'ghosts'} in room
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile Settings Panel */}
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
                    <Switch
                      id="dark-mode"
                      checked={darkMode}
                      onCheckedChange={setDarkMode}
                      className="bg-muted-foreground/10"
                    />
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="space-y-2">
                      <Label>Current Session</Label>
                      <p className="text-sm text-muted-foreground">
                        Logged in as <span className="text-foreground">{session.nickname}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Room: <code className="text-foreground cursor-pointer inline-flex items-center gap-1 group hover:text-muted-foreground transition-colors" onClick={handleCopyToken}>
                                {session.roomToken}
                                <Copy className="h-3 w-3" />
                              </code>
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleLogout}
                    variant="destructive"
                    className="w-full rounded-xl h-11"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Leave Room
                  </Button>
                </div>
              </div>
            </div>
          )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Outside container so it's positioned correctly */}
      <MobileNav activeTab={mobileTab} onTabChange={setMobileTab} />
    </div>
  );
}
