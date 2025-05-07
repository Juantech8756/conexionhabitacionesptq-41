
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Mic, MicOff, Send, ArrowLeft, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import AudioMessagePlayer from "@/components/AudioMessagePlayer";
import CallInterface from "@/components/CallInterface";

interface GuestChatProps {
  guestName: string;
  roomNumber: string;
  guestId: string;
  onBack: () => void;
}

type MessageType = {
  id: string;
  content: string;
  is_guest: boolean;
  is_audio: boolean;
  audio_url?: string;
  created_at: string;
};

const GuestChat = ({ guestName, roomNumber, guestId, onBack }: GuestChatProps) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  console.log("GuestChat renderizado con los datos:", {guestName, roomNumber, guestId});

  // Modified: Scroll behavior adjusted for reversed layout
  const scrollToBottom = (smooth = true) => {
    if (scrollAreaRef.current) {
      // For a reversed flex layout, we need to scroll to top to see newest messages
      scrollAreaRef.current.scrollTo({
        top: 0,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  // Fetch messages on initial load
  useEffect(() => {
    const fetchMessages = async () => {
      console.log("Intentando obtener mensajes para el guestId:", guestId);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('guest_id', guestId)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        console.log("Mensajes obtenidos:", data);
        
        if (data.length === 0) {
          // Add welcome message if no messages exist
          const welcomeMessage = {
            id: 'welcome',
            guest_id: guestId,
            content: `¡Hola ${guestName}! Bienvenido/a al Parque Temático Quimbaya. ¿En qué podemos ayudarte?`,
            is_guest: false,
            is_audio: false,
            created_at: new Date().toISOString()
          };
          
          const { error: insertError } = await supabase
            .from('messages')
            .insert([welcomeMessage]);
            
          if (!insertError) {
            setMessages([welcomeMessage]);
            console.log("Mensaje de bienvenida agregado");
          }
        } else {
          setMessages(data);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los mensajes",
          variant: "destructive",
        });
      }
    };
    
    if (guestId) {
      fetchMessages();
      
      // Subscribe to new messages
      const channel = supabase
        .channel('messages-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `guest_id=eq.${guestId}`
          },
          (payload) => {
            console.log("Nuevo mensaje recibido:", payload);
            setMessages(prev => [...prev, payload.new as MessageType]);
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [guestId, guestName, toast]);

  // Scroll to bottom on new messages
  useEffect(() => {
    // When using flex-direction: column-reverse, we need to scroll to top (0)
    setTimeout(() => scrollToBottom(), 50);
    setTimeout(() => scrollToBottom(), 300); // Additional attempt for reliability
  }, [messages]);

  // Focus input field when component mounts
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
    }
  }, []);

  const sendMessage = async () => {
    if (message.trim() === "" || isLoading) return;
    
    setIsLoading(true);
    
    try {
      const newMessage = {
        guest_id: guestId,
        content: message,
        is_guest: true,
        is_audio: false
      };
      
      const { error } = await supabase
        .from('messages')
        .insert([newMessage]);
      
      if (error) throw error;
      
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        setIsLoading(true);
        
        try {
          const audioBlob = new Blob(chunks, { type: "audio/webm" });
          
          // Upload audio to Supabase Storage
          const fileName = `audio_${Date.now()}_${guestId}.webm`;
          const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('audio_messages')
            .upload(fileName, audioBlob);
          
          if (uploadError) throw uploadError;
          
          // Get public URL for the uploaded file
          const { data: publicUrlData } = supabase
            .storage
            .from('audio_messages')
            .getPublicUrl(fileName);
          
          // Insert message with audio URL
          const newAudioMessage = {
            guest_id: guestId,
            content: "Mensaje de voz",
            is_guest: true,
            is_audio: true,
            audio_url: publicUrlData.publicUrl
          };
          
          const { error: messageError } = await supabase
            .from('messages')
            .insert([newAudioMessage]);
          
          if (messageError) throw messageError;
          
          setAudioChunks([]);
        } catch (error) {
          console.error("Error uploading audio:", error);
          toast({
            title: "Error",
            description: "No se pudo enviar el mensaje de voz",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
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

  const startCall = () => {
    setIsCallActive(true);
  };

  const endCall = () => {
    setIsCallActive(false);
  };

  // Keep this function for other formatting needs
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="chat-container">
      {/* Header fixed at top */}
      <header className="gradient-header-soft p-3 shadow-md chat-header">
        <div className="flex items-center justify-between">
          <motion.button 
            whileHover={{ scale: isMobile ? 1.05 : 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack} 
            className="mr-2 p-2 rounded-full hover:bg-white/10 transition-colors" 
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </motion.button>
          <div className="flex-grow">
            <h1 className="text-lg font-semibold text-white">Recepción</h1>
            <p className="text-sm opacity-90 text-white">Cabaña {roomNumber} - {guestName}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={startCall}
            className="ml-2 text-white hover:bg-white/20"
          >
            <Phone className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Chat messages area with proper scrolling - reversed layout */}
      <div className="chat-scroll-area" ref={scrollAreaRef}>
        <div className="message-container">
          <div className={`space-y-3 ${isMobile ? "max-w-full" : "max-w-3xl"} mx-auto p-3 w-full`}>
            {messages.length === 0 && (
              <div className="empty-chat-message">
                <p>No hay mensajes aún. ¡Inicia la conversación!</p>
              </div>
            )}
            
            <AnimatePresence>
              {/* We don't need to reverse the messages array since the container is already reversed */}
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.is_guest ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`${isMobile ? "max-w-[85%]" : "max-w-[80%]" } ${
                      msg.is_audio ? '' : 'p-3'
                    } ${
                      msg.is_guest 
                        ? 'chat-bubble-guest shadow-md' 
                        : 'chat-bubble-staff shadow-sm'
                    } ${msg.is_audio ? 'overflow-hidden' : ''}`}
                  >
                    {msg.is_audio ? (
                      <AudioMessagePlayer 
                        audioUrl={msg.audio_url || ''} 
                        isGuest={msg.is_guest}
                      />
                    ) : (
                      <p className={isMobile ? "text-sm break-words" : "break-words"}>{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Chat input area fixed at bottom with high z-index */}
      <div className="chat-input-container">
        <div className={`flex items-center space-x-2 w-full ${isMobile ? "max-w-full" : "max-w-3xl"} mx-auto`}>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={toggleRecording}
            className={`flex-shrink-0 transition-all duration-300 chat-input-button ${isRecording ? 'bg-red-100 text-red-600 border-red-300' : ''}`}
            disabled={isLoading}
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
            className="flex-grow shadow-sm focus:ring-2 focus:ring-blue-500/30 transition-all text-sm"
            disabled={isRecording || isLoading}
            ref={inputRef}
          />
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              type="button"
              size="icon"
              onClick={sendMessage}
              disabled={message.trim() === "" || isRecording || isLoading}
              className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-sm chat-input-button"
            >
              <Send className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Call interface */}
      {isCallActive && (
        <CallInterface 
          isGuest={true}
          guestId={guestId}
          roomNumber={roomNumber}
          guestName={guestName}
          onClose={endCall}
        />
      )}
    </div>
  );
};

export default GuestChat;
