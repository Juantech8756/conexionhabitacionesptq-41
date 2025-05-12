
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import AudioRecorder from "@/components/AudioRecorder";
import MediaUploader from "@/components/MediaUploader";
import { Guest } from "@/types/dashboard";

interface MessageInputPanelProps {
  selectedGuest: Guest | null;
  replyText: string;
  setReplyText: (text: string) => void;
  isLoading: boolean;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  onSendMessage: () => void;
  onAudioRecorded: (audioBlob: Blob) => Promise<void>;
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
  isMobile,
}) => {
  return (
    <div className={`${isMobile ? "p-3" : "p-4"} border-t bg-white shadow-inner fixed bottom-0 left-0 right-0 z-10`}>
      <div className={`flex items-center space-x-2 ${!isMobile && "max-w-3xl mx-auto"}`}>
        <AudioRecorder
          onAudioRecorded={onAudioRecorded}
          onCancel={onAudioCanceled}
          disabled={isLoading || !!selectedFile}
          title="Grabar mensaje de voz"
        />
        
        <MediaUploader
          guestId={selectedGuest?.id || ""}
          onUploadComplete={() => {}} // Passing empty function to prevent duplicate handling
          disabled={isLoading}
          onFileSelect={onFileSelect}
          selectedFile={selectedFile}
        />
        
        <Input
          placeholder="Escriba su respuesta..."
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          onKeyPress={e => e.key === "Enter" && !e.shiftKey && onSendMessage()}
          className={isMobile ? "flex-grow shadow-sm text-sm" : "flex-grow"}
          disabled={isLoading || !!selectedFile}
        />
        
        <Button
          type="button"
          onClick={onSendMessage}
          disabled={(replyText.trim() === "" && !selectedFile) || isLoading}
          className="flex-shrink-0 bg-gradient-to-r from-hotel-600 to-hotel-500 hover:from-hotel-700 hover:to-hotel-600"
        >
          <Send className="h-4 w-4 mr-2" />
          {!isMobile && "Enviar"}
        </Button>
      </div>
    </div>
  );
};

export default MessageInputPanel;
