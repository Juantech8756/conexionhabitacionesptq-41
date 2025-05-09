
import { useState, useRef } from "react";
import { Mic, MicOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import AudioMessagePlayer from "@/components/AudioMessagePlayer";
import { showGlobalAlert } from "@/hooks/use-alerts";

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void;
  onCancel: () => void;
  isGuest?: boolean;
  isDark?: boolean;
  disabled?: boolean;
  title?: string;
}

const AudioRecorder = ({ 
  onAudioRecorded, 
  onCancel, 
  isGuest = false, 
  isDark = false, 
  disabled = false,
  title
}: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(url);
      };
      
      recorder.start();
      setAudioRecorder(recorder);
      setIsRecording(true);
      
      // Show a notification
      showGlobalAlert({
        title: "Grabando audio",
        description: "Hable ahora. Pulse el botón de nuevo para detener la grabación.",
        duration: 5000
      });
    } catch (err) {
      console.error("Error accessing microphone:", err);
      showGlobalAlert({
        title: "Error de acceso al micrófono",
        description: "No se pudo acceder al micrófono. Verifique los permisos del navegador.",
        variant: "destructive",
        duration: 5000
      });
    }
  };

  const stopRecording = () => {
    if (audioRecorder) {
      audioRecorder.stop();
      setIsRecording(false);
      
      // Stop all audio tracks
      audioRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSendAudio = () => {
    if (audioBlob) {
      onAudioRecorded(audioBlob);
    }
  };

  const handleCancel = () => {
    // Clear audio preview
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    onCancel();
  };

  // Solo mostrar el botón cuando no hay una vista previa
  if (!audioUrl) {
    return (
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={toggleRecording}
        className={`flex-shrink-0 ${isRecording ? 'bg-red-100 text-red-600 border-red-300 animate-pulse' : ''}`}
        disabled={disabled}
        title={title || (isRecording ? "Detener grabación" : "Grabar mensaje de voz")}
      >
        {isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
    );
  }

  // Mostrar la vista previa del audio
  return (
    <div className="absolute bottom-full mb-2 w-[calc(100%-1rem)] mx-auto left-0 right-0 z-10">
      <div className="relative shadow-lg rounded-md bg-white">
        <AudioMessagePlayer 
          audioUrl={audioUrl} 
          isGuest={isGuest}
          isDark={isDark}
          isPreview={true}
          onSend={handleSendAudio}
        />
        <Button 
          onClick={handleCancel} 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 rounded-full bg-black/40 hover:bg-black/60 text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AudioRecorder;
