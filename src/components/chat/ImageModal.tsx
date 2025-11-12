'use client';

import { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName?: string;
  alt?: string;
}

export function ImageModal({ isOpen, onClose, imageUrl, fileName, alt }: ImageModalProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.5, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName || 'image';
    link.click();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
      onClick={handleBackdropClick}
    >
      {/* Header Controls */}
      <div className="absolute top-2 left-2 right-2 sm:top-4 sm:left-4 sm:right-4 flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center z-10">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:p-2"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 5}
            className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:p-2"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            className="h-8 sm:h-auto hidden sm:inline-flex"
          >
            Reset
          </Button>
          {fileName && (
            <span className="text-white text-xs sm:text-sm bg-black/50 px-2 py-1 rounded truncate max-w-[120px] sm:max-w-none">
              {fileName}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            className="h-8 sm:h-auto"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Download</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:p-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image Container */}
      <div 
        className="relative w-full h-full flex items-center justify-center overflow-hidden p-2 sm:p-4 pt-20 sm:pt-16 pb-12 sm:pb-16"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={imageUrl}
          alt={alt || fileName || 'Image'}
          className={`max-w-full max-h-full object-contain transition-transform duration-200 ${
            zoom > 1 ? 'cursor-move' : 'cursor-zoom-in'
          }`}
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleReset}
          draggable={false}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      </div>

      {/* Instructions */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 sm:bottom-4">
        <div className="bg-black/50 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap">
          <span className="hidden sm:inline">Double-click to reset • Drag to pan when zoomed</span>
          <span className="sm:hidden">Pinch to zoom</span>
        </div>
      </div>
    </div>
  );
}