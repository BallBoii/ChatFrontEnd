import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GhostLogo } from "./GhostLogo";
import { Loader2 } from "lucide-react";
import { useEventNotifications } from "./useEventNotifications";
import { useSocket } from "@/context/SocketContext";

interface UserSetupModalProps {
  open: boolean;
  onUsernameSet: () => void;
}

export function UserSetupModal({ open, onUsernameSet }: UserSetupModalProps) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { error } = useEventNotifications();
  const { socket, setUsername: socketSetUsername } = useSocket();

  useEffect(() => {
    if (!socket || !open) return;

    const handleUsernameSet = () => {
      setLoading(false);
      onUsernameSet();
    };

    const handleError = ({ message }: { message: string }) => {
      setLoading(false);
    };

    socket.on("username_set", handleUsernameSet);
    socket.on("error", handleError);

    return () => {
      socket.off("username_set", handleUsernameSet);
      socket.off("error", handleError);
    };
  }, [socket, open, onUsernameSet, error]);

  const handleSetUsername = () => {
    if (!username.trim()) {
      error("Please enter a username");
      return;
    }

    if (username.trim().length < 2) {
      error("Username must be at least 2 characters");
      return;
    }
    if (username.trim().length > 20) {
      error("Username must be 20 characters or less");
      return;
    }

    setLoading(true);
    socketSetUsername(username.trim());
  };

  return (
    <Dialog open={open} modal>
      <DialogContent className="sm:max-w-md border-border bg-card shadow-2xl" hideClose>
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="text-primary">
              <GhostLogo size={32} />
            </div>
            <DialogTitle className="text-2xl">Welcome to GhostRooms</DialogTitle>
          </div>
          <DialogDescription className="text-center text-muted-foreground">
            Choose your username to get started
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Your Username</Label>
            <Input
              id="username"
              placeholder="Ghost Friend"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetUsername()}
              className="h-11 rounded-xl border-border bg-input-background"
              maxLength={20}
              autoFocus
            />
          </div>
          <Button
            onClick={handleSetUsername}
            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Setting username...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </div>

        <div className="absolute inset-0 -z-10 overflow-hidden rounded-lg pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl" />
        </div>
      </DialogContent>
    </Dialog>
  );
}