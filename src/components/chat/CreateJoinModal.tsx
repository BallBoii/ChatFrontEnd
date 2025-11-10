import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GhostLogo } from "./GhostLogo";
import { Copy, Check, Loader2 } from "lucide-react";
import { useEventNotifications } from "./useEventNotifications";
import { roomService } from "@/lib/services/roomService";
import type { Session } from "@/types/chat";

interface CreateJoinModalProps {
  open: boolean;
  onJoin: (session: Session) => void;
}

export function CreateJoinModal({ open, onJoin }: CreateJoinModalProps) {
  const [mode, setMode] = useState<"initial" | "create" | "join">("initial");
  const [nickname, setNickname] = useState("");
  const [token, setToken] = useState("");
  const [createdToken, setCreatedToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { success, error } = useEventNotifications();

  const handleCreate = async () => {
    if (!nickname.trim()) {
      error("Please enter a nickname");
      return;
    }

    setLoading(true);
    try {
      // Create room on backend
      const room = await roomService.createRoom(24); // 24 hours TTL
      setCreatedToken(room.token);
      success("Room created successfully!");
    } catch (err) {
      console.error('Failed to create room:', err);
      error(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!nickname.trim()) {
      error("Please enter a nickname");
      return;
    }
    if (!token.trim()) {
      error("Please enter a room token");
      return;
    }

    setLoading(true);
    try {
      // Validate room first
      const isValid = await roomService.validateRoom(token);
      if (!isValid) {
        error("Invalid or expired room token");
        return;
      }

      // Join the room
      const session = await roomService.joinRoom(token, nickname);
      // Note: Success notification will be shown by SocketContext when room_joined event is received
      onJoin(session);
    } catch (err) {
      console.error('Failed to join room:', err);
      error(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToRoom = async () => {
    if (!createdToken) return;

    setLoading(true);
    try {
      // Join the room we just created
      const session = await roomService.joinRoom(createdToken, nickname);
      // Note: Success notification will be shown by SocketContext when room_joined event is received
      onJoin(session);
    } catch (err) {
      console.error('Failed to enter room:', err);
      error(err instanceof Error ? err.message : "Failed to enter room");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(createdToken);
    setCopied(true);
    success("Token copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} modal>
      <DialogContent className="sm:max-w-md border-border bg-card shadow-2xl" hideClose>
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="text-primary">
              <GhostLogo size={32} />
            </div>
            <DialogTitle className="text-2xl">GhostRooms</DialogTitle>
          </div>
          <DialogDescription className="text-center text-muted-foreground">
            {mode === "initial" && "Session-only chat. No accounts, no history."}
            {mode === "create" && !createdToken && "Create a temporary room"}
            {mode === "create" && createdToken && "Share this token to invite others"}
            {mode === "join" && "Join an existing room"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === "initial" && (
            <div className="space-y-3">
              <Button
                onClick={() => setMode("create")}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 transition-all duration-200"
              >
                Create New Room
              </Button>
              <Button
                onClick={() => setMode("join")}
                variant="outline"
                className="w-full h-12 rounded-xl border-2 hover:bg-muted transition-all duration-200"
              >
                Join Existing Room
              </Button>
            </div>
          )}

          {mode === "create" && !createdToken && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nickname">Your Nickname</Label>
                <Input
                  id="nickname"
                  placeholder="Ghost Friend"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="h-11 rounded-xl border-border bg-input-background"
                  maxLength={20}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setMode("initial")}
                  variant="outline"
                  className="flex-1 h-11 rounded-xl"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreate}
                  className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : 'Create Room'}
                </Button>
              </div>
            </div>
          )}

          {mode === "create" && createdToken && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Room Token</Label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-4 h-11 rounded-xl bg-muted border border-border">
                    <code className="flex-1 tracking-wider">{createdToken}</code>
                  </div>
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 rounded-xl"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleContinueToRoom}
                className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Entering...</> : 'Enter Room'}
              </Button>
            </div>
          )}

          {mode === "join" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="join-nickname">Your Nickname</Label>
                <Input
                  id="join-nickname"
                  placeholder="Ghost Friend"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="h-11 rounded-xl border-border bg-input-background"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token">Room Token</Label>
                <Input
                  id="token"
                  placeholder="ABC123XY"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toLowerCase())}
                  className="h-11 rounded-xl border-border bg-input-background tracking-wider"
                  maxLength={20}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setMode("initial")}
                  variant="outline"
                  className="flex-1 h-11 rounded-xl"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleJoin}
                  className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Joining...</> : 'Join Room'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="absolute inset-0 -z-10 overflow-hidden rounded-lg pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
