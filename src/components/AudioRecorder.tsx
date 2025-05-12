
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, X } from "lucide-react";

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
  title?: string;
}

const AudioRecorder = ({
  onAudioRecorded,
  onCancel,
  disabled = false,
  title = "Grabar audio"
}: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Auto-send audio once recording is complete
  useEffect(() => {
    if (audioBlob) {
      // Small timeout to ensure UI updates before sending
      const timer = setTimeout(() => {
        handleSendAudio();
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [audioBlob]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSendAudio = async () => {
    if (audioBlob) {
      await onAudioRecorded(audioBlob);
      setAudioBlob(null);
    }
  };

  const handleCancel = () => {
    setAudioBlob(null);
    onCancel();
  };

  // Display controls when audio has been recorded
  if (audioBlob) {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleSendAudio}
          className="bg-green-500 hover:bg-green-600"
        >
          Enviar audio
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      onClick={toggleRecording}
      disabled={disabled}
      className={isRecording ? "bg-red-100 text-red-600 border-red-300 animate-pulse" : ""}
      title={title}
    >
      {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
};

export default AudioRecorder;
