import type { UIMessage } from "@/types/chat";
import { useState, useEffect } from "react";
import { getStickerUrl } from "@/lib/utils/stickerMap";
import { ImageModal } from "./ImageModal";

type MessageProps = UIMessage;

export function Message(message: MessageProps) {
  const { type, nickname, createdAt, isMine, isSystem } = message;
  const [stickerUrl, setStickerUrl] = useState<string | null>(null);
  const [stickerLoaded, setStickerLoaded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    fileName?: string;
    alt?: string;
  } | null>(null);

  // Load sticker URL when it's a sticker message
  useEffect(() => {
    if (type === 'STICKER' && !stickerLoaded) {
      getStickerUrl(message.content).then(url => {
        setStickerUrl(url);
        setStickerLoaded(true);
      });
    }
  }, [type, message.content, stickerLoaded]);
  
  // Format timestamp
  const timestamp = new Date(createdAt).toLocaleTimeString("en-US", { 
    hour: "2-digit", 
    minute: "2-digit" 
  });

  const sender = nickname || 'Unknown';

  // Handle image double-click
  const handleImageDoubleClick = (url: string, fileName?: string, alt?: string) => {
    setSelectedImage({ url, fileName, alt });
  };

  // Close image modal
  const closeImageModal = () => {
    setSelectedImage(null);
  };

  // Render system messages differently
  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-muted/50 px-3 py-1.5 rounded-full">
          <p className="text-xs text-muted-foreground text-center">
            {message.type === 'TEXT' ? message.content : ''}
          </p>
        </div>
      </div>
    );
  }

  // Message bubble styling based on type
  const getBubbleClasses = (messageType: UIMessage['type']) => {
    const baseClasses = "rounded-2xl min-w-0 w-fit";
    const positionClasses = isMine
      ? "bg-primary text-primary-foreground rounded-tr-md ml-2"
      : "bg-muted text-foreground rounded-tl-md mr-2";

    switch (messageType) {
      case 'STICKER':
      case 'IMAGE':
        return `${baseClasses} ${positionClasses} p-2`;
      case 'TEXT':
      case 'FILE':
      default:
        return `${baseClasses} ${positionClasses} px-3 py-2 sm:px-4 sm:py-2.5`;
    }
  };

  const renderMessageContent = () => {
    switch (type) {
      case 'STICKER': {
        // Wait for the correct URL to be loaded from config
        if (!stickerUrl) {
          return (
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
              <div className="text-4xl animate-pulse">👻</div>
            </div>
          );
        }
        
        return (
          <div className="relative w-16 h-16 sm:w-20 sm:h-20">
            <img
              src={stickerUrl}
              alt={message.content}
              className="w-full h-full object-contain cursor-pointer"
              loading="eager"
              onDoubleClick={() => handleImageDoubleClick(stickerUrl, `${message.content}.png`, message.content)}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // Show a placeholder emoji if image fails to load
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.sticker-fallback')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'sticker-fallback flex items-center justify-center w-full h-full text-4xl';
                  fallback.textContent = '👻';
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
        );
      }

      case 'IMAGE': {
        return (
          <div className="space-y-2">
            {message.content && (
              <p className="text-sm break-words overflow-wrap-anywhere">{message.content}</p>
            )}
            {message.attachments.map((attachment, idx) => (
              <img
                key={idx}
                src={attachment.url}
                alt={attachment.fileName || 'Image'}
                className="w-full max-w-xs rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                loading="lazy"
                onDoubleClick={() => handleImageDoubleClick(
                  attachment.url, 
                  attachment.fileName, 
                  attachment.fileName || 'Image'
                )}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ))}
          </div>
        );
      }

      case 'FILE': {
        return (
          <div className="space-y-2">
            {message.content && (
              <p className="text-sm mb-2 break-words overflow-wrap-anywhere">{message.content}</p>
            )}
            {message.attachments.map((attachment, idx) => (
              <a
                key={idx}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm hover:underline break-all"
              >
                📎 <span className="break-all">{attachment.fileName || 'Download file'}</span>
              </a>
            ))}
          </div>
        );
      }

      case 'TEXT':
      default:
        return (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
            {message.content}
          </p>
        );
    }
  };
  

  return (
    <>
      <div className={`flex gap-2 sm:gap-3 mb-4 ${isMine ? "flex-row-reverse" : ""}`}>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-sm">{sender.charAt(0).toUpperCase()}</span>
        </div>
        <div className={`flex flex-col gap-1 min-w-0 max-w-[75%] sm:max-w-[70%] md:max-w-md ${isMine ? "items-end" : "items-start"}`}>
          <div className="flex items-center gap-2 px-1 max-w-full">
            <span className="text-xs text-muted-foreground font-medium truncate">
              {isMine ? "You" : sender}
            </span>
            <span className="text-xs text-muted-foreground opacity-70 flex-shrink-0">{timestamp}</span>
          </div>

          {/* Message Bubble */}
          <div className={getBubbleClasses(type)}>
            {renderMessageContent()}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          isOpen={!!selectedImage}
          onClose={closeImageModal}
          imageUrl={selectedImage.url}
          fileName={selectedImage.fileName}
          alt={selectedImage.alt}
        />
      )}
    </>
  );
}