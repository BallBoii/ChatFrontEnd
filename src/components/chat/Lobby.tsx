'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ActiveUsersPanel } from "@/components/chat/ActiveUsersPanel";
import { RoomBrowser } from "@/components/chat/RoomBrowser";
import { GhostLogo } from "@/components/chat/GhostLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, DoorOpen, Sun, Moon, ArrowLeft } from "lucide-react";
import type { Session } from "@/types/chat";

interface LobbyProps {
  nickname: string;
  darkMode: boolean;
  onDarkModeToggle: () => void;
  onJoin: (session: Session) => Promise<void>;
  onStartDM: (targetUser: string) => Promise<void>;
  onBack: () => void;
}

export function Lobby({ nickname, darkMode, onDarkModeToggle, onJoin, onStartDM, onBack }: LobbyProps) {
  const [activeTab, setActiveTab] = useState<"users" | "rooms">("users");

  return (
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
              </div>
              <div>
                <DialogDescription className="text-sm text-muted-foreground">
                  <span className="font-medium">{nickname}</span>
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="h-8 w-8 p-0 rounded-full border-border items-center justify-center transition-colors cursor-pointer bg-muted hover:bg-muted/80 group flex-shrink-0"
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </Badge>
              <Badge
                variant="outline"
                className="h-8 w-8 p-0 rounded-full border-border items-center justify-center transition-colors cursor-pointer bg-muted group flex-shrink-0"
                onClick={onDarkModeToggle}
              >
                {darkMode ? (
                  <Moon className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <Sun className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                )}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant={activeTab === "users" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("users")}
            className="rounded-lg flex-1"
          >
            <Users className="h-4 w-4 mr-2" />
            Users
          </Button>
          <Button
            variant={activeTab === "rooms" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("rooms")}
            className="rounded-lg flex-1"
          >
            <DoorOpen className="h-4 w-4 mr-2" />
            Rooms
          </Button>
        </div>

        {/* Content - Flexible Height with Scroll */}
        <div className="min-h-[100px] max-h-[450px] flex flex-col -mx-6">
          {activeTab === "users" && <ActiveUsersPanel currentNickname={nickname} onStartDM={onStartDM} />}
          {activeTab === "rooms" && <RoomBrowser nickname={nickname} onJoin={onJoin} />}
        </div>

        {/* Decorative Background Blobs */}
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-lg pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
