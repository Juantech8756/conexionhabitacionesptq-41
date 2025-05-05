
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { MessageCircle, Mic, MicOff, Send, ArrowLeft } from "lucide-react";

interface GuestChatProps {
  guestName: string;
  roomNumber: string;
  onBack: () => void;
}

type MessageType = {
  id: string;
  text: string;
  isGuest: boolean;
  isAudio?: boolean;
  audioUrl?: string;
  timestamp: Date;
};

const GuestChat = ({ guestName, roomNumber, onBack }: GuestChatProps) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: "welcome",
      text: `¡Hola ${guestName}! Bienvenido/a. ¿En qué podemos ayudarte?`,
      isGuest: false,
      timestamp: new Date(),
    },
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const sendMessage = () => {
    if (message.trim() === "") return;
    
    const newMessage: MessageType = {
      id: generateId(),
      text: message,
      isGuest: true,
      timestamp: new Date(),
    };
    
    setMessages([...messages, newMessage]);
    setMessage("");
    
    // Simulación de respuesta de la recepción después de 1-2 segundos
    setTimeout(() => {
      const receptionResponse: MessageType = {
        id: generateId(),
        text: "Gracias por su mensaje. Un miembro del personal le responderá en breve.",
        isGuest: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, receptionResponse]);
    }, 1000 + Math.random() * 1000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const newAudioMessage: MessageType = {
          id: generateId(),
          text: "Mensaje de voz",
          isGuest: true,
          isAudio: true,
          audioUrl: audioUrl,
          timestamp: new Date(),
        };
        
        setMessages([...messages, newAudioMessage]);
        setAudioChunks([]);
        
        // Simulación de respuesta
        setTimeout(() => {
          const receptionResponse: MessageType = {
            id: generateId(),
            text: "Hemos recibido su mensaje de voz. Le responderemos en breve.",
            isGuest: false,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, receptionResponse]);
        }, 1000 + Math.random() * 1000);
      };
      
      recorder.start();
      setAudioRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
      
      toast({
        title: "Grabando audio",
        description: "Hable ahora. Pulse el botón de nuevo para detener la grabación.",
      });
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast({
        title: "Error de acceso al micrófono",
        description: "No se pudo acceder al micrófono. Verifique los permisos del navegador.",
        variant: "destructive",
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

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('es', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="bg-gradient-to-r from-hotel-600 to-hotel-500 text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="mr-2" aria-label="Volver">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-grow">
            <h1 className="text-lg font-semibold">Recepción</h1>
            <p className="text-sm opacity-90">Habitación {roomNumber} - {guestName}</p>
          </div>
          <MessageCircle className="h-5 w-5" />
        </div>
      </header>

      <ScrollArea className="flex-grow p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isGuest ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 ${
                  msg.isGuest ? 'chat-bubble-guest' : 'chat-bubble-staff'
                }`}
              >
                {msg.isAudio ? (
                  <audio controls src={msg.audioUrl} className="w-full">
                    Su navegador no soporta el elemento de audio.
                  </audio>
                ) : (
                  <p>{msg.text}</p>
                )}
                <p className="text-xs mt-1 opacity-70 text-right">
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={toggleRecording}
            className={`flex-shrink-0 ${isRecording ? 'bg-red-100 text-red-600 border-red-300' : ''}`}
          >
            {isRecording ? (
              <MicOff className="h-5 w-5 recording-animation" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
          
          <Input
            placeholder="Escriba su mensaje..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className="flex-grow"
            disabled={isRecording}
          />
          
          <Button
            type="button"
            size="icon"
            onClick={sendMessage}
            disabled={message.trim() === "" || isRecording}
            className="flex-shrink-0 bg-hotel-600 hover:bg-hotel-700"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GuestChat;
