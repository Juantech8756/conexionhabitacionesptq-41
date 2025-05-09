import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Mic, MicOff, Send, ArrowLeft, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import AudioMessagePlayer from "@/components/AudioMessagePlayer";
import MediaMessage from "@/components/MediaMessage";
import MediaUploader from "@/components/MediaUploader";
import CallInterface from "@/components/CallInterface";
import { showGlobalAlert } from "@/hooks/use-alerts";

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
  is_media?: boolean;
  media_url?: string;
  media_type?: 'image' | 'video';
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
  const [hasShownWelcomeMessage, setHasShownWelcomeMessage] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Show a welcome alert when chat starts, but only once
  useEffect(() => {
    if (!hasShownWelcomeMessage) {
      const timer = setTimeout(() => {
        showGlobalAlert({
          title: "¡Bienvenido al chat de soporte!",
          description: "Estamos aquí para ayudarte con cualquier consulta durante tu estancia.",
          duration: 5000
        });
        setHasShownWelcomeMessage(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [hasShownWelcomeMessage]);

  // Scroll to newest messages
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end"
      });
    }
  };

  // Fetch messages on initial load
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('guest_id', guestId)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        if (data.length === 0) {
          // Add welcome message if no messages exist
          const welcomeMessage = {
            id: 'welcome',
            guest_id: guestId,
            content: `¡Hola ${guestName}! Bienvenido/a al Parque Temático Quimbaya. ¿En qué podemos ayudarte?`,
            is_guest: false,
            is_audio: false,
            is_media: false,
            created_at: new Date().toISOString()
          };
          
          const { error: insertError } = await supabase
            .from('messages')
            .insert([welcomeMessage]);
            
          if (!insertError) {
            setMessages([welcomeMessage as MessageType]);
          }
        } else {
          // Cast data to ensure it matches MessageType
          const typedMessages = data.map(msg => ({
            ...msg,
            media_type: msg.media_type as 'image' | 'video' | undefined
          }));
          setMessages(typedMessages as MessageType[]);
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
            // Ensure we cast the entire payload to MessageType with correct media_type
            const newMessage: MessageType = {
              ...payload.new as any,
              media_type: payload.new.media_type as 'image' | 'video' | undefined
            };
            
            setMessages(prev => [...prev, newMessage]);
            
            // Si recibimos un nuevo mensaje de recepción, mostrar alerta
            if (!newMessage.is_guest) {
              showGlobalAlert({
                title: "Nuevo mensaje de recepción",
                description: "Has recibido un nuevo mensaje de nuestro equipo.",
                duration: 3000
              });
            }
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
    scrollToBottom();
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
        is_audio: false,
        is_media: false
      };
      
      const { error } = await supabase
        .from('messages')
        .insert([newMessage]);
      
      if (error) throw error;
      
      setMessage("");
      scrollToBottom(false);
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

  const handleMediaUpload = async (mediaUrl: string, mediaType: 'image' | 'video') => {
    setIsLoading(true);
    
    try {
      const newMessage = {
        guest_id: guestId,
        content: mediaType === 'image' ? "Imagen compartida" : "Video compartido",
        is_guest: true,
        is_audio: false,
        is_media: true,
        media_url: mediaUrl,
        media_type: mediaType
      };
      
      console.log("Sending media message:", newMessage);
      
      const { error } = await supabase
        .from('messages')
        .insert([newMessage]);
      
      if (error) {
        console.error("Error inserting media message:", error);
        throw error;
      }
      
      console.log("Media message inserted successfully");
      
      scrollToBottom(false);
      
      toast({
        title: mediaType === 'image' ? "Imagen enviada" : "Video enviado",
        description: "Se ha enviado correctamente.",
      });
      
    } catch (error) {
      console.error("Error sending media message:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el archivo",
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
          scrollToBottom(false);
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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-hotel-600 to-hotel-500 p-3 shadow-sm text-white">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2 text-white hover:bg-white/20"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-grow">
            <h2 className="text-base font-semibold">Recepción</h2>
            <p className="text-xs text-white/90">
              Cabaña {roomNumber} - {guestName}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              startCall();
              // Show alert about the call
              showGlobalAlert({
                title: "Llamada a recepción",
                description: "Conectando con recepción. Por favor espere...",
                duration: 3000
              });
            }}
            className="text-white hover:bg-white/20"
            title="Llamar a recepción"
          >
            <Phone className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-grow overflow-auto p-3" ref={scrollContainerRef}>
        <div className="space-y-3 pb-4">
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-gray-500 mt-10 p-6"
              >
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No hay mensajes aún. ¡Inicia la conversación!</p>
              </motion.div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.is_guest ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg shadow-sm ${
                      msg.is_guest 
                        ? 'bg-gradient-to-r from-hotel-600 to-hotel-500 text-white rounded-tr-none' 
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                    } ${msg.is_audio || msg.is_media ? 'p-0 overflow-hidden' : 'p-3'}`}
                  >
                    {msg.is_audio ? (
                      <AudioMessagePlayer 
                        audioUrl={msg.audio_url || ''} 
                        isGuest={msg.is_guest}
                        isDark={msg.is_guest}
                      />
                    ) : msg.is_media && msg.media_url && msg.media_type ? (
                      <MediaMessage
                        mediaUrl={msg.media_url}
                        mediaType={msg.media_type}
                        isGuest={msg.is_guest}
                      />
                    ) : (
                      <p className="text-sm break-words">{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 border-t bg-white shadow-inner">
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={toggleRecording}
            className={`flex-shrink-0 ${isRecording ? 'bg-red-100 text-red-600 border-red-300 animate-pulse' : ''}`}
            disabled={isLoading}
          >
            {isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          
          <MediaUploader 
            guestId={guestId} 
            onUploadComplete={handleMediaUpload} 
            disabled={isRecording || isLoading}
          />
          
          <Input
            placeholder="Escriba su mensaje..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className="flex-grow shadow-sm text-sm"
            disabled={isRecording || isLoading}
            ref={inputRef}
          />
          
          <Button
            type="button"
            size="icon"
            onClick={sendMessage}
            disabled={message.trim() === "" || isRecording || isLoading}
            className="flex-shrink-0 bg-gradient-to-r from-hotel-600 to-hotel-500 hover:from-hotel-700 hover:to-hotel-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Call interface */}
      {isCallActive && (
        <CallInterface 
          isGuest={true}
          guestId={guestId}
          roomNumber={roomNumber}
          guestName={guestName}
          onClose={() => {
            endCall();
            // Show alert about call end
            showGlobalAlert({
              title: "Llamada finalizada",
              description: "La llamada con recepción ha terminado.",
              duration: 3000
            });
          }}
        />
      )}
    </div>
  );
};

export default GuestChat;
