import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { GhostLogo } from "./GhostLogo";
import { Copy, Check, Loader2, Users, Clock, Globe, RefreshCw } from "lucide-react";
import { useEventNotifications } from "./useEventNotifications";
import { roomService } from "@/lib/services/roomService";
import type { Session } from "@/types/chat";

interface CreateJoinModalProps {
  open: boolean;
  onJoin: (session: Session) => void;
}

export function CreateJoinModal({ open, onJoin }: CreateJoinModalProps) {
  const [mode, setMode] = useState<"initial" | "create" | "join" | "public">("initial");
  const [nickname, setNickname] = useState("");
  const [roomName, setRoomName] = useState("");
  const [ttlHours, setTtlHours] = useState(24);
  const [isPublic, setIsPublic] = useState(false);
  const [token, setToken] = useState("");
  const [createdToken, setCreatedToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publicRooms, setPublicRooms] = useState<Array<{ token: string; name?: string; participantCount: number; expiresAt: string; createdAt: string }>>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { success, error } = useEventNotifications();

  const handleCreate = async () => {
    if (!nickname.trim()) {
      error("Please enter a nickname");
      return;
    }

    // Validate nickname length (2-20 characters to match backend)
    if (nickname.trim().length < 2) {
      error("Nickname must be at least 2 characters");
      return;
    }
    if (nickname.trim().length > 20) {
      error("Nickname must be 20 characters or less");
      return;
    }

    setLoading(true);
    try {
      // Create room on backend with custom name, TTL, and public flag
      const room = await roomService.createRoom(ttlHours, roomName.trim() || undefined, isPublic);
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

    // Validate nickname length (2-20 characters to match backend)
    if (nickname.trim().length < 2) {
      error("Nickname must be at least 2 characters");
      return;
    }
    if (nickname.trim().length > 20) {
      error("Nickname must be 20 characters or less");
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

  const handlePublicMode = async () => {
    setMode("public");
    await loadPublicRooms();
  };

  const loadPublicRooms = async () => {
    setLoading(true);
    try {
      const rooms = await roomService.getPublicRooms();
      setPublicRooms(rooms);
    } catch (err) {
      console.error('Failed to load public rooms:', err);
      error(err instanceof Error ? err.message : "Failed to load public rooms");
    } finally {
      setLoading(false);
    }
  };

  const refreshPublicRooms = async () => {
    setIsRefreshing(true);
    try {
      const rooms = await roomService.getPublicRooms();
      setPublicRooms(rooms);
    } catch (err) {
      console.error('Failed to refresh public rooms:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh public rooms every 5 seconds when in public mode
  useEffect(() => {
    if (mode === "public" && open) {
      // Initial load
      loadPublicRooms();
      
      // Set up interval for auto-refresh
      refreshIntervalRef.current = setInterval(() => {
        refreshPublicRooms();
      }, 5000); // Refresh every 5 seconds

      // Cleanup on unmount or mode change
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    } else {
      // Clear interval if not in public mode
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }
  }, [mode, open]);

  const handleJoinPublicRoom = async (roomToken: string) => {
    if (!nickname.trim()) {
      error("Please enter a nickname first");
      return;
    }

    // Validate nickname length (2-20 characters to match backend)
    if (nickname.trim().length < 2) {
      error("Nickname must be at least 2 characters");
      return;
    }
    if (nickname.trim().length > 20) {
      error("Nickname must be 20 characters or less");
      return;
    }

    setLoading(true);
    try {
      const session = await roomService.joinRoom(roomToken, nickname);
      onJoin(session);
    } catch (err) {
      console.error('Failed to join room:', err);
      error(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      return `${Math.floor(hours / 24)}d`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
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
            {mode === "public" && "Browse and join public rooms"}
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
                onClick={handlePublicMode}
                variant="outline"
                className="w-full h-12 rounded-xl border-2 hover:bg-muted transition-all duration-200"
              >
                Browse Public Rooms
              </Button>
              <Button
                onClick={() => setMode("join")}
                variant="outline"
                className="w-full h-12 rounded-xl border-2 hover:bg-muted transition-all duration-200"
              >
                Join with Token
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
              <div className="space-y-2">
                <Label htmlFor="roomName">Room Name (Optional)</Label>
                <Input
                  id="roomName"
                  placeholder="My Ghost Room"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="h-11 rounded-xl border-border bg-input-background"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ttl">Room Duration</Label>
                <Select value={ttlHours.toString()} onValueChange={(value) => setTtlHours(Number(value))}>
                  <SelectTrigger className="h-11 rounded-xl border-border bg-input-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="12">12 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                    <SelectItem value="72">72 hours</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(checked as boolean)}
                />
                <Label
                  htmlFor="isPublic"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Make this room public (discoverable by all users)
                </Label>
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

          {mode === "public" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="public-nickname">Your Nickname</Label>
                <Input
                  id="public-nickname"
                  placeholder="Ghost Friend"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="h-11 rounded-xl border-border bg-input-background"
                  maxLength={20}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Public Rooms</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshPublicRooms}
                  disabled={isRefreshing || loading}
                  className="h-8 px-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : publicRooms.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No public rooms available</p>
                  <p className="text-xs mt-1">Auto-refreshing every 5 seconds</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {publicRooms.map((room) => (
                    <div
                      key={room.token}
                      className="p-3 rounded-xl border border-border bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">
                            {room.name || 'Unnamed Room'}
                          </h4>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {room.participantCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeRemaining(room.expiresAt)}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleJoinPublicRoom(room.token)}
                          disabled={loading || !nickname.trim()}
                          className="rounded-lg"
                        >
                          Join
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={() => setMode("initial")}
                variant="outline"
                className="w-full h-11 rounded-xl"
                disabled={loading}
              >
                Back
              </Button>
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
