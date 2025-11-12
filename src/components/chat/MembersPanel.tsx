import { Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MembersPanelProps {
  participantCount: number;
  participants: string[]; // List of all nicknames
  currentNickname: string;
}

export function MembersPanel({ participantCount, participants, currentNickname }: MembersPanelProps) {
  return (
    <div className="w-64 border-r border-border bg-card hidden md:flex flex-col">
      <div className="h-16 px-4 flex items-center gap-2 border-b border-border shrink-0">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Members ({participantCount})</span>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-1">
            {/* Show all participants */}
            {participants.map((participant, index) => {
              const isCurrentUser = participant === currentNickname;
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
        </ScrollArea>
      </div>
    </div>
  );
}
