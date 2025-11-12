import { useState, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Smile, Paperclip } from "lucide-react";
import { StickerPicker } from "./StickerPicker";
import { Sticker } from "@/types/sticker";
import { FilePicker } from "./FilePicker";

interface MessageComposerProps {
  onSend: (message: string) => void;
  onStickerSend?: (sticker: Sticker) => void;
  onFileSend?: (files: File[], type: 'IMAGE' | 'FILE', caption?: string) => void;
}

export function MessageComposer({ onSend, onStickerSend, onFileSend }: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [filePickerOpen, setFilePickerOpen] = useState(false);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStickerSelect = (sticker: Sticker) => {
    if (onStickerSend) {
      onStickerSend(sticker);
    }
    setShowStickerPicker(false);
  };

  const handleFileSelect = (files: File[], type: 'IMAGE' | 'FILE') => {
    if (onFileSend) {
      onFileSend(files, type);
    }
    setFilePickerOpen(false);
  };

  return (
    <>
      <div className="border-t border-border bg-card p-4 shrink-0">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="min-h-[52px] max-h-32 resize-none rounded-xl border-border bg-input-background pr-20 py-3"
              rows={1}
            />
            <div className="absolute right-2 bottom-2 flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-muted"
                type="button"
                onClick={() => setShowStickerPicker(true)}
              >
                <Smile className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-muted"
                type="button"
                onClick={() => setFilePickerOpen(true)}
              >
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
          <Button
            onClick={handleSend}
            disabled={!message.trim()}
            className="h-[52px] w-[52px] rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all duration-200"
            size="icon"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 px-1">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>

      <StickerPicker
        isOpen={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onStickerSelect={handleStickerSelect}
      />

      <FilePicker
        isOpen={filePickerOpen}
        onClose={() => setFilePickerOpen(false)}
        onFileSelect={handleFileSelect}
      />
    </>
  );
}
