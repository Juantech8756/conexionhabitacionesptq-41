import React, { useRef, useState } from "react";
import { SendHorizonal, Mic, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Guest } from "@/types/dashboard";
import AudioRecorder from "@/components/AudioRecorder";

interface MessageInputPanelProps {
  selectedGuest: Guest;
  replyText: string;
  setReplyText: (text: string) => void;
  isLoading: boolean;
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onSendMessage: () => void;
  onAudioRecorded: (blob: Blob) => Promise<void>;
  onAudioCanceled: () => void;
  isMobile: boolean;
}

const MessageInputPanel: React.FC<MessageInputPanelProps> = ({
  selectedGuest,
  replyText,
  setReplyText,
  isLoading,
  selectedFile,
  onFileSelect,
  onSendMessage,
  onAudioRecorded,
  onAudioCanceled,
  isMobile
}) => {
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (replyText.trim() || selectedFile) {
        onSendMessage();
      }
    }
  };
  
  // Handle file click
  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };
  
  // Reset selected file
  const handleResetFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onFileSelect(null as unknown as File);
  };

  return (
    <div className={`bg-white py-2 px-3 shadow-[0_-2px_5px_rgba(0,0,0,0.05)] border-t border-hotel-100
      ${isMobile ? 'sticky bottom-0 left-0 right-0 z-20' : ''}`}>
      <div className="max-w-2xl mx-auto w-full">
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
              onCancel={() => {
                onAudioCanceled();
                setShowAudioRecorder(false);
              }}
              title="Grabar mensaje de audio"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Escribe un mensaje..."
                className="min-h-[36px] max-h-[36px] resize-none pr-10 py-1.5 bg-muted/30 border-muted focus-visible:ring-primary/30 rounded-xl text-sm"
                disabled={isLoading}
              />
              
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="absolute bottom-1 right-1 h-5 w-5 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                onClick={handleFileClick}
                title="Adjuntar imagen"
                disabled={isLoading}
              >
                <Image className="h-3 w-3" />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </Button>
            </div>
            
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="icon"
                type="button"
                onClick={() => setShowAudioRecorder(true)}
                disabled={isLoading}
                title="Grabar audio"
                className="h-7 w-7 rounded-full border-muted bg-muted/30 hover:bg-muted/50"
              >
                <Mic className="h-3 w-3 text-muted-foreground" />
              </Button>
              
              <Button
                type="button"
                size="icon"
                onClick={onSendMessage}
                disabled={(!replyText.trim() && !selectedFile) || isLoading}
                title="Enviar mensaje"
                className="h-7 w-7 rounded-full bg-primary hover:bg-primary/90"
              >
                <SendHorizonal className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageInputPanel;
