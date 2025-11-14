import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { useSocket } from "@/context/SocketContext";

interface ActiveUsersPanelProps {
  currentNickname: string;
}

export function ActiveUsersPanel({ currentNickname }: ActiveUsersPanelProps) {
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const { socket, getActiveUsers } = useSocket();

  useEffect(() => {
    if (!socket) return;

    getActiveUsers();

    const handleActiveUsers = ({ users }: { users: string[] }) => {
      console.log('[ActiveUsers] Received update:', users);
      setActiveUsers(users);
    };

    socket.on("active_users", handleActiveUsers);

    return () => {
      socket.off("active_users", handleActiveUsers);
    };
  }, [socket, getActiveUsers]);

  return (
    <div className="space-y-4 py-4 px-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Active Users ({activeUsers.length})</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </div>
      </div>

      {activeUsers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No other users online</p>
          <p className="text-xs mt-1">Be the first!</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {activeUsers.map((user, index) => {
            const isYou = user === currentNickname;
            return (
              <div
                key={`${user}-${index}`}
                className={`p-3 rounded-xl border transition-colors ${
                  isYou
                    ? 'bg-primary/10 border-primary/20'
                    : 'bg-muted/50 border-border hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isYou
                        ? 'bg-gradient-to-br from-primary/30 to-secondary/30'
                        : 'bg-gradient-to-br from-muted to-muted-foreground/20'
                    }`}>
                      {user.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-card" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user}
                      {isYou && <span className="text-xs text-muted-foreground ml-2">(you)</span>}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}