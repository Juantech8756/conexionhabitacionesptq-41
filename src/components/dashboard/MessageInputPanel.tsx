import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Mic, Image } from "lucide-react";
import AudioRecorder from "@/components/AudioRecorder";

interface MessageInputPanelProps {
  replyText: string;
  setReplyText: (value: React.SetStateAction<string>) => void;
  isLoading: boolean;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  onSendMessage: () => Promise<void>;
  onAudioRecorded: (audioBlob: Blob) => Promise<void>;
  onMediaUploadComplete?: (mediaUrl: string, mediaType: 'image' | 'video') => Promise<boolean>;
  isMobile?: boolean;
}

const MessageInputPanel: React.FC<MessageInputPanelProps> = ({
  replyText,
  setReplyText,
  isLoading,
  selectedFile,
  onFileSelect,
  onSendMessage,
  onAudioRecorded,
  onMediaUploadComplete,
  isMobile = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyText(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && replyText.trim()) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleResetFile = () => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAudioCancel = () => {
    setShowAudioRecorder(false);
  };

  return (
    <div className={`message-input-panel-container bg-white shadow-[0_-2px_5px_rgba(0,0,0,0.05)] border-t border-hotel-100`}>
      <div className="max-w-2xl mx-auto w-full px-3">
        {selectedFile && (
          <div className="mb-2 flex items-center bg-muted/70 p-1.5 rounded-md">
            <div className="flex-1 font-medium text-xs truncate">
              {selectedFile.name}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleResetFile}
              className="h-5 w-5 text-muted-foreground hover:text-foreground p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        {showAudioRecorder ? (
          <div className="p-2 bg-muted/70 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-medium">Grabación de audio</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAudioRecorder(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <AudioRecorder 
              onAudioRecorded={onAudioRecorded}
              onCancel={handleAudioCancel}
              title="Grabar mensaje de audio"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Textarea
                value={replyText}
                onChange={handleTextChange}
                onKeyDown={handleKeyPress}
                placeholder="Escribe un mensaje..."
                className="min-h-[36px] max-h-[36px] py-1.5 pl-3 resize-none pr-10 bg-muted/30 border-muted focus-visible:ring-primary/30 rounded-xl text-sm"
                disabled={isLoading}
              />
              
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 h-5 w-5 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                onClick={handleFileClick}
                title="Adjuntar imagen"
                disabled={isLoading}
              >
                <Image className="h-3.5 w-3.5" />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAudioRecorder(true)}
              disabled={isLoading}
              className="h-9 w-9 rounded-full text-muted-foreground bg-muted/30 hover:text-foreground hover:bg-muted/50"
              title="Enviar mensaje de voz"
            >
              <Mic className="h-4 w-4" />
            </Button>
            
            <Button
              variant="default"
              size="icon"
              onClick={onSendMessage}
              disabled={isLoading || (!replyText.trim() && !selectedFile)}
              className="h-9 w-9 p-0 rounded-full text-white bg-primary hover:bg-primary/90"
              title="Enviar mensaje"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageInputPanel;
