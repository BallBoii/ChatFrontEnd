'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Upload, File, Image, FileText, Video, Music, Archive } from 'lucide-react';
import { Attachment } from '@/types/chat';

interface FilePickerProps {
  onFileSelect: (files: File[], type: 'IMAGE' | 'FILE', caption?: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface FileCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  accept: string;
  maxSize: number; // in MB
  description: string;
}

const FILE_CATEGORIES: FileCategory[] = [
  {
    id: 'all',
    name: 'All Files',
    icon: <File className="h-4 w-4" />,
    accept: '*/*',
    maxSize: 50,
    description: 'Any file up to 50MB'
  },
  {
    id: 'images',
    name: 'Images',
    icon: <Image className="h-4 w-4" />,
    accept: 'image/*',
    maxSize: 10,
    description: 'PNG, JPG, GIF up to 10MB'
  },
  {
    id: 'documents',
    name: 'Documents',
    icon: <FileText className="h-4 w-4" />,
    accept: '.pdf,.doc,.docx,.txt,.rtf',
    maxSize: 25,
    description: 'PDF, DOC, TXT up to 25MB'
  },
  {
    id: 'archives',
    name: 'Archives',
    icon: <Archive className="h-4 w-4" />,
    accept: '.zip,.rar,.7z,.tar,.gz',
    maxSize: 50,
    description: 'ZIP, RAR, 7Z up to 50MB'
  }
];

export function FilePicker({ onFileSelect, isOpen, onClose }: FilePickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCategoryData = FILE_CATEGORIES.find(cat => cat.id === activeCategory);

  const handleFileSelection = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (!activeCategoryData) return false;
      
      // Size check
      const maxSizeBytes = activeCategoryData.maxSize * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        console.warn(`File ${file.name} exceeds size limit`);
        return false;
      }
      
      return true;
    });

    setSelectedFiles(validFiles);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelection(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleSend = () => {
    if (selectedFiles.length > 0) {
      const messageType = activeCategory === 'images' ? 'IMAGE' : 'FILE';
      onFileSelect(selectedFiles, messageType, caption.trim() || undefined);
      
      // Reset state
      setSelectedFiles([]);
      setCaption('');
      onClose();
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (file.type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (file.type.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (file.type.includes('pdf') || file.type.includes('document')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  // Reset state when modal closes
  const handleClose = () => {
    setSelectedFiles([]);
    setCaption('');
    setActiveCategory('images');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="bg-background border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg sm:mx-4 max-h-[80vh] sm:max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold">Send Files</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 rounded-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Category Tabs */}
        <div className="p-4 pb-2">
          <div className="overflow-x-auto">
            <div className="flex space-x-2 pb-2 min-w-max">
              {FILE_CATEGORIES.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(category.id)}
                  className="whitespace-nowrap text-xs flex items-center gap-1 flex-shrink-0"
                >
                  {category.icon}
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* File Upload Area */}
        <div className="flex-1 px-4 pb-4 space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={openFileDialog}
            className={`
              border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors
              ${dragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }
            `}
          >
            <div className="text-center space-y-2">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Click to browse or drag files here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeCategoryData?.description}
                </p>
              </div>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={activeCategoryData?.accept}
            onChange={(e) => handleFileSelection(e.target.files)}
            className="hidden"
          />

          {/* Caption/Description Input */}
          {/* {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {activeCategory === 'images' ? 'Caption' : 'Description'} (optional)
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={`Add a ${activeCategory === 'images' ? 'caption' : 'description'}...`}
                className="w-full p-3 text-sm border border-border rounded-lg bg-input resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                rows={2}
                maxLength={500}
              />
            </div>
          )} */}

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Selected Files ({selectedFiles.length})</h4>
              <div className="max-h-40 overflow-y-auto rounded-lg">
                <ScrollArea className="h-full overflow-y-auto">
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          {getFileIcon(file)}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={selectedFiles.length === 0}
              className="flex-1"
            >
              Send {selectedFiles.length > 0 && `(${selectedFiles.length})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}