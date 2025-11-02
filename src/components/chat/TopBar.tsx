import { GhostLogo } from "./GhostLogo";
import { Badge } from "@/components/ui/badge";
import { Clock, Copy, Sun, Moon } from "lucide-react";
import { useEventNotifications } from "./useEventNotifications";

interface TopBarProps {
  token: string;
  timeLeft: string;
  darkMode: boolean;
  setDarkMode: (mode: boolean) => void;
}

export function TopBar({ token, timeLeft, darkMode, setDarkMode }: TopBarProps) {
  const { success } = useEventNotifications();
  
  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    success("Token copied to clipboard");
  };

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  }

  return (
    <div className="h-16 border-b border-border bg-card px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="text-primary">
          <GhostLogo size={28} />
        </div>
        <h1 className="text-xl">GhostRooms</h1>
      </div>

      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className="hidden sm:flex h-8 px-3 rounded-full bg-muted hover:bg-muted border-0 cursor-pointer group text-muted-foreground"
          onClick={handleCopyToken}
        >
          <span className="tracking-wider mr-2">{token}</span>
          <Copy className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
        </Badge>
        <Badge
          variant="outline"
          className="hidden md:flex h-8 w-8 p-0 rounded-full border-border items-center justify-center transition-colors cursor-pointer bg-muted group"
          onClick={handleToggleDarkMode}
        >
          {darkMode ? (
            <Moon className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
          ) : (
            <Sun className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
          )}
        </Badge>
        <Badge
          variant="outline"
          className="h-8 px-3 rounded-full border-border"
        >
          <Clock className="h-3 w-3 mr-1.5" />
          <span className="text-xs">{timeLeft}</span>
        </Badge>
      </div>
    </div>
  );
}
