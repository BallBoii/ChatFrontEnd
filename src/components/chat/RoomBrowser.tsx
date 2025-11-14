import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Check, Loader2, Users, Clock, Globe, RefreshCw, Plus, LogIn } from "lucide-react";
import { useEventNotifications } from "./useEventNotifications";
import { roomService } from "@/lib/services/roomService";
import type { Session } from "@/types/chat";

interface RoomBrowserProps {
  nickname: string;
  onJoin: (session: Session) => void;
}

export function RoomBrowser({ nickname, onJoin }: RoomBrowserProps) {
  const [activeTab, setActiveTab] = useState("create");
  
  // Create room states
  const [roomName, setRoomName] = useState("");
  const [ttlHours, setTtlHours] = useState(24);
  const [isPublic, setIsPublic] = useState(false);
  const [createdToken, setCreatedToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  
  // Join room states
  const [joinToken, setJoinToken] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  
  // Public rooms states
  const [publicRooms, setPublicRooms] = useState<Array<{ 
    token: string; 
    name?: string; 
    participantCount: number; 
    expiresAt: string; 
    createdAt: string 
  }>>([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { success, error } = useEventNotifications();

  // Auto-refresh public rooms
  useEffect(() => {
    if (activeTab === "public") {
      loadPublicRooms();
      
      refreshIntervalRef.current = setInterval(() => {
        refreshPublicRooms();
      }, 5000);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }
  }, [activeTab]);

  const handleCreate = async () => {
    if (!nickname.trim()) {
      error("Please set your username first");
      return;
    }

    setCreateLoading(true);
    try {
      const room = await roomService.createRoom(ttlHours, roomName.trim() || undefined, isPublic);
      setCreatedToken(room.token);
      success("Room created successfully!");
    } catch (err) {
      console.error('Failed to create room:', err);
      error(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEnterCreatedRoom = async () => {
    if (!createdToken) return;

    setCreateLoading(true);
    try {
      const session = await roomService.joinRoom(createdToken, nickname);
      onJoin(session);
    } catch (err) {
      console.error('Failed to enter room:', err);
      error(err instanceof Error ? err.message : "Failed to enter room");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!nickname.trim()) {
      error("Please set your username first");
      return;
    }

    if (!joinToken.trim()) {
      error("Please enter a room token");
      return;
    }

    setJoinLoading(true);
    try {
      const isValid = await roomService.validateRoom(joinToken);
      if (!isValid) {
        error("Invalid or expired room token");
        return;
      }

      const session = await roomService.joinRoom(joinToken, nickname);
      onJoin(session);
    } catch (err) {
      console.error('Failed to join room:', err);
      error(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setJoinLoading(false);
    }
  };

  const loadPublicRooms = async () => {
    setPublicLoading(true);
    try {
      const rooms = await roomService.getPublicRooms();
      setPublicRooms(rooms);
    } catch (err) {
      console.error('Failed to load public rooms:', err);
      error(err instanceof Error ? err.message : "Failed to load public rooms");
    } finally {
      setPublicLoading(false);
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

  const handleJoinPublicRoom = async (roomToken: string) => {
    if (!nickname.trim()) {
      error("Please set your username first");
      return;
    }

    setPublicLoading(true);
    try {
      const session = await roomService.joinRoom(roomToken, nickname);
      onJoin(session);
    } catch (err) {
      console.error('Failed to join room:', err);
      error(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setPublicLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(createdToken);
    setCopied(true);
    success("Token copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
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
    <div className="space-y-4 py-4 px-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create" className="gap-2">
            <Plus className="h-4 w-4" />
            Create
          </TabsTrigger>
          <TabsTrigger value="join" className="gap-2">
            <LogIn className="h-4 w-4" />
            Join
          </TabsTrigger>
          <TabsTrigger value="public" className="gap-2">
            <Globe className="h-4 w-4" />
            Public
          </TabsTrigger>
        </TabsList>

        {/* Create Room Tab */}
        <TabsContent value="create" className="space-y-4 mt-4">
          {!createdToken ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="roomName">Room Name (Optional)</Label>
                <Input
                  id="roomName"
                  placeholder="My Ghost Room"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="h-11 rounded-xl"
                  maxLength={50}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ttl">Room Duration</Label>
                <Select value={ttlHours.toString()} onValueChange={(value) => setTtlHours(Number(value))}>
                  <SelectTrigger className="h-11 rounded-xl">
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
                <Label htmlFor="isPublic" className="text-sm cursor-pointer">
                  Make this room public (discoverable by all users)
                </Label>
              </div>

              <Button
                onClick={handleCreate}
                className="w-full h-11 rounded-xl"
                disabled={createLoading}
              >
                {createLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" /> Create Room
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              {/* <div className="p-3 rounded-xl bg-muted/50 border border-border"> */}
                <p className="text-sm text-muted-foreground mb-2">Share this token:</p>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 h-10 rounded-xl bg-background border">
                    <code className="flex-1 tracking-wider font-mono text-sm">{createdToken}</code>
                  </div>
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              {/* </div> */}

              <div className="space-y-2">
                <Button
                  onClick={handleEnterCreatedRoom}
                  className="w-full h-11 rounded-xl"
                  disabled={createLoading}
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Entering...
                    </>
                  ) : (
                    'Enter Room'
                  )}
                </Button>
                <Button
                  onClick={() => setCreatedToken("")}
                  variant="outline"
                  className="w-full h-11 rounded-xl"
                >
                  Create Another Room
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Join Room Tab */}
        <TabsContent value="join" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="joinToken">Room Token</Label>
            <Input
              id="joinToken"
              placeholder="ABC123XY"
              value={joinToken}
              onChange={(e) => setJoinToken(e.target.value.toLowerCase())}
              className="h-11 rounded-xl tracking-wider font-mono"
              maxLength={20}
            />
          </div>

          <Button
            onClick={handleJoin}
            className="w-full h-11 rounded-xl"
            disabled={joinLoading || !joinToken.trim()}
          >
            {joinLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Joining...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" /> Join Room
              </>
            )}
          </Button>
        </TabsContent>

        {/* Public Rooms Tab */}
        <TabsContent value="public" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">
              Public Rooms ({publicRooms.length})
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshPublicRooms}
              disabled={isRefreshing || publicLoading}
              className="h-8 px-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {publicLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : publicRooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No public rooms available</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {publicRooms.map((room) => (
                <div
                  key={room.token}
                  className="p-3 rounded-xl border border-border bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate text-sm">
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
                      disabled={publicLoading}
                      className="rounded-lg"
                    >
                      Join
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}