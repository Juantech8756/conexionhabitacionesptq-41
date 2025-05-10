import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Mic, MicOff, Send, ArrowLeft, Phone, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import AudioMessagePlayer from "@/components/AudioMessagePlayer";
import MediaMessage from "@/components/MediaMessage";
import MediaUploader from "@/components/MediaUploader";
import CallInterface from "@/components/CallInterface";
import { showGlobalAlert } from "@/hooks/use-alerts";
import { useNotifications } from "@/hooks/use-notifications";
import { sendNotificationToReception, formatMessageNotification } from "@/utils/notification";
import NotificationPermissionRequest from "@/components/NotificationPermissionRequest";
import AudioRecorder from "@/components/AudioRecorder";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import { RealtimeChannel } from "@supabase/supabase-js";

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

// Estados locales para seguimiento de mensajes
type MessageStatus = 'sending' | 'sent' | 'error';
type PendingMessage = {
  localId: string;
  type: 'text' | 'audio' | 'media';
  content: string;
  audioBlob?: Blob;
  mediaFile?: File;
  status: MessageStatus;
  retryCount: number;
};

const GuestChat = ({ guestName, roomNumber, guestId, onBack }: GuestChatProps) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showNotificationsPrompt, setShowNotificationsPrompt] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [lastPollTime, setLastPollTime] = useState(Date.now());
  
  // Obtener el roomId de la tabla de huéspedes
  const [roomId, setRoomId] = useState<string | null>(null);
  
  useEffect(() => {
    // Obtener el roomId basado en el guestId
    const fetchRoomId = async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('room_id')
        .eq('id', guestId)
        .single();
      
      if (data && data.room_id) {
        setRoomId(data.room_id);
      }
    };
    
    if (guestId) {
      fetchRoomId();
    }
  }, [guestId]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { permission, isSubscribed } = useNotifications({
    type: 'guest',
    guestId,
    roomNumber,
    roomId: roomId || undefined
  });

  // Comprobar conexión en tiempo real
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  
  useEffect(() => {
    // Configurar un canal para monitorear la conexión en tiempo real
    const channel = supabase.channel('guest-connection-monitor');
    
    channel
      .on('system', { event: 'connected' }, () => {
        console.log('Guest chat realtime connected');
        setIsRealtimeConnected(true);
      })
      .on('system', { event: 'disconnected' }, () => {
        console.log('Guest chat realtime disconnected');
        setIsRealtimeConnected(false);
      })
      .subscribe((status) => {
        console.log(`Guest chat connection status: ${status}`);
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
        } else if (status !== 'SUBSCRIBED' && status !== 'SUBSCRIBING') {
          setIsRealtimeConnected(false);
        }
      });
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Sistema de sondeo de respaldo para asegurar que se reciban mensajes
  useEffect(() => {
    const pollInterval = setInterval(() => {
      // Sólo sondeamos si hace más de 10 segundos del último sondeo
      if (Date.now() - lastPollTime > 10000) {
        pollNewMessages();
        setLastPollTime(Date.now());
      }
      
      // También reintentamos enviar mensajes pendientes
      retryPendingMessages();
      
    }, 15000); // Sondeo cada 15 segundos
    
    return () => clearInterval(pollInterval);
  }, [lastPollTime, pendingMessages]);

  // Función para sondear mensajes nuevos
  const pollNewMessages = async () => {
    try {
      console.log("Sondeando mensajes nuevos...");
      
      if (!messages.length) return;
      
      // Obtenemos la fecha del último mensaje
      const latestMessageDate = new Date(messages[messages.length - 1]?.created_at || 0);
      
      // Buscar mensajes más recientes que el último que tenemos
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('guest_id', guestId)
        .gt('created_at', latestMessageDate.toISOString())
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        console.log(`Sondeo encontró ${data.length} mensajes nuevos`);
        
        // Transformar los datos para asegurarnos que cumplan con MessageType
        const typedMessages: MessageType[] = data.map(msg => ({
          id: msg.id,
          content: msg.content,
          is_guest: msg.is_guest,
          is_audio: msg.is_audio,
          audio_url: msg.audio_url,
          is_media: msg.is_media || false,
          media_url: msg.media_url,
          media_type: msg.media_type as 'image' | 'video' | undefined,
          created_at: msg.created_at || new Date().toISOString(),
        }));
        
        // Actualizar mensajes locales con los nuevos mensajes
        setMessages(prev => [...prev, ...typedMessages]);
        
        // Scroll hacia abajo para mostrar los nuevos mensajes
        setTimeout(() => scrollToBottom(true), 100);
      }
    } catch (err) {
      console.error("Error sondeando mensajes:", err);
    }
  };

  // Función para reintentar enviar mensajes pendientes
  const retryPendingMessages = async () => {
    if (pendingMessages.length === 0) return;
    
    console.log(`Reintentando enviar ${pendingMessages.length} mensajes pendientes...`);
    
    // Procesamos un mensaje a la vez para evitar sobrecarga
    const messageToRetry = pendingMessages.find(msg => msg.status === 'error');
    if (!messageToRetry) return;
    
    // Actualizamos el estado a 'sending'
    setPendingMessages(prev => prev.map(msg => 
      msg.localId === messageToRetry.localId 
        ? { ...msg, status: 'sending', retryCount: msg.retryCount + 1 }
        : msg
    ));
    
    try {
      if (messageToRetry.type === 'text') {
        await sendMessageToServer(messageToRetry.localId, messageToRetry.content);
      } else if (messageToRetry.type === 'audio' && messageToRetry.audioBlob) {
        await uploadAudio(messageToRetry.localId, messageToRetry.audioBlob);
      } else if (messageToRetry.type === 'media' && messageToRetry.mediaFile) {
        // Implementar manejo de reintento para medios
      }
    } catch (err) {
      console.error(`Error reintentando mensaje ${messageToRetry.localId}:`, err);
      
      // Si ya se ha intentado más de 3 veces, lo marcamos como error permanente
      if (messageToRetry.retryCount >= 3) {
        toast({
          title: "Error al enviar mensaje",
          description: "No se pudo enviar el mensaje después de varios intentos",
          variant: "destructive"
        });
        
        // Removemos el mensaje de pendientes después de demasiados intentos
        setPendingMessages(prev => prev.filter(msg => msg.localId !== messageToRetry.localId));
      } else {
        // Actualizamos el estado a 'error' para reintentar más tarde
        setPendingMessages(prev => prev.map(msg => 
          msg.localId === messageToRetry.localId 
            ? { ...msg, status: 'error' }
            : msg
        ));
      }
    }
  };

  // Show a welcome alert when chat starts, but only once
  useEffect(() => {
    const timer = setTimeout(() => {
      showGlobalAlert({
        title: "¡Bienvenido al chat de soporte!",
        description: "Estamos aquí para ayudarte con cualquier consulta durante tu estancia.",
        duration: 5000
      });
      
      // Check if we should show notifications prompt
      if (permission !== 'granted' && permission !== 'denied' && !isSubscribed) {
        setShowNotificationsPrompt(true);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [permission, isSubscribed]);

  // Configuración del canal en tiempo real para mensajes
  useEffect(() => {
    const messageChannel = supabase.channel(`guest-messages-${guestId}`);
    
    messageChannel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `guest_id=eq.${guestId}`
      }, (payload) => {
        console.log('Nuevo mensaje recibido en tiempo real:', payload);
        
        // Sólo añadir el mensaje si no lo tenemos ya
        const newMsg = payload.new;
        
        if (newMsg) {
          const typedMessage: MessageType = {
            id: newMsg.id,
            content: newMsg.content,
            is_guest: newMsg.is_guest,
            is_audio: newMsg.is_audio,
            audio_url: newMsg.audio_url,
            is_media: newMsg.is_media || false,
            media_url: newMsg.media_url,
            media_type: newMsg.media_type as 'image' | 'video' | undefined,
            created_at: newMsg.created_at || new Date().toISOString(),
          };
          
          setMessages(prev => {
            if (!prev.some(msg => msg.id === typedMessage.id)) {
              return [...prev, typedMessage];
            }
            return prev;
          });
          
          // Scroll hacia abajo para mostrar el nuevo mensaje
          setTimeout(() => scrollToBottom(true), 100);
        }
      })
      .subscribe((status) => {
        console.log(`Canal de mensajes estatus: ${status}`);
      });
    
    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [guestId]);

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
          const welcomeMessage: MessageType = {
            id: 'welcome',
            content: `¡Hola ${guestName}! Bienvenido/a al Parque Temático Quimbaya. ¿En qué podemos ayudarte?`,
            is_guest: false,
            is_audio: false,
            is_media: false,
            created_at: new Date().toISOString()
          };
          
          setMessages([welcomeMessage]);
        } else {
          // Transformamos para garantizar tipos correctos
          const typedMessages: MessageType[] = data.map(msg => ({
            id: msg.id,
            content: msg.content,
            is_guest: msg.is_guest,
            is_audio: msg.is_audio,
            audio_url: msg.audio_url,
            is_media: msg.is_media || false,
            media_url: msg.media_url,
            media_type: msg.media_type as 'image' | 'video' | undefined,
            created_at: msg.created_at || new Date().toISOString(),
          }));
          
          setMessages(typedMessages);
        }
        
        // Scroll to bottom after messages load
        setTimeout(() => scrollToBottom(false), 100);
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los mensajes",
          variant: "destructive"
        });
      }
    };
    
    fetchMessages();
  }, [guestId, guestName, toast]);
  
  // Enviar mensaje de texto
  const sendMessage = async () => {
    if (message.trim() === "") return;
    
    const messageText = message.trim();
    const localId = `local-${Date.now()}`;
    setMessage("");
    
    // Agregar mensaje optimista a la UI inmediatamente
    const optimisticMessage: MessageType = {
      id: localId,
      content: messageText,
      is_guest: true,
      is_audio: false,
      is_media: false,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Agregar a pendientes
    setPendingMessages(prev => [
      ...prev, 
      {
        localId,
        type: 'text',
        content: messageText,
        status: 'sending',
        retryCount: 0
      }
    ]);
    
    // Scroll hacia abajo para mostrar el mensaje nuevo
    setTimeout(() => scrollToBottom(true), 100);
    
    try {
      await sendMessageToServer(localId, messageText);
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Marcar como error para reintentar más tarde
      setPendingMessages(prev => prev.map(msg => 
        msg.localId === localId 
          ? { ...msg, status: 'error' }
          : msg
      ));
      
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje. Se reintentará automáticamente.",
        variant: "destructive"
      });
    }
  };
  
  // Función para enviar mensaje al servidor
  const sendMessageToServer = async (localId: string, messageText: string) => {
    try {
      // Configurar el nuevo mensaje
      const newMessage = {
        guest_id: guestId,
        content: messageText,
        is_guest: true,
        is_audio: false
      };
      
      // Insertar en la base de datos
      const { data, error } = await supabase
        .from('messages')
        .insert([newMessage])
        .select()
        .single();
      
      if (error) throw error;
      
      console.log("Mensaje enviado exitosamente:", data);
      
      const typedMessage: MessageType = {
        id: data.id,
        content: data.content,
        is_guest: data.is_guest,
        is_audio: data.is_audio,
        audio_url: data.audio_url,
        is_media: data.is_media || false,
        media_url: data.media_url,
        media_type: data.media_type as 'image' | 'video' | undefined,
        created_at: data.created_at || new Date().toISOString(),
      };
      
      // Actualizar mensajes locales reemplazando el mensaje optimista
      setMessages(prev => prev.map(msg => 
        msg.id === localId ? typedMessage : msg
      ));
      
      // Remover de pendientes
      setPendingMessages(prev => prev.filter(msg => msg.localId !== localId));
      
      // Enviar notificación a recepción
      await sendNotificationToReception(formatMessageNotification(
        true,
        messageText,
        guestName,
        roomNumber,
        guestId
      ));
      
      return data;
    } catch (err) {
      console.error("Error en sendMessageToServer:", err);
      throw err;
    }
  };

  // Handle audio recording
  const handleAudioRecorded = async (audioBlob: Blob) => {
    if (!guestId) return;
    
    const localId = `local-audio-${Date.now()}`;
    
    // Agregar mensaje optimista a la UI
    const optimisticMessage: MessageType = {
      id: localId,
      content: "Mensaje de voz",
      is_guest: true,
      is_audio: true,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Agregar a pendientes
    setPendingMessages(prev => [
      ...prev, 
      {
        localId,
        type: 'audio',
        content: "Mensaje de voz",
        audioBlob,
        status: 'sending',
        retryCount: 0
      }
    ]);
    
    // Scroll hacia abajo
    setTimeout(() => scrollToBottom(true), 100);
    
    try {
      await uploadAudio(localId, audioBlob);
    } catch (error) {
      console.error("Error uploading audio:", error);
      
      // Marcar como error para reintentar
      setPendingMessages(prev => prev.map(msg => 
        msg.localId === localId 
          ? { ...msg, status: 'error' }
          : msg
      ));
      
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje de voz. Se reintentará automáticamente.",
        variant: "destructive"
      });
    }
  };
  
  // Función para subir audio al servidor
  const uploadAudio = async (localId: string, audioBlob: Blob) => {
    setIsLoading(true);
    
    try {
      // Subir a Supabase Storage
      const fileName = `audio_${Date.now()}_guest.webm`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('audio_messages')
        .upload(fileName, audioBlob);
        
      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: publicUrlData } = supabase
        .storage
        .from('audio_messages')
        .getPublicUrl(fileName);

      // Agregar mensaje con audio
      const newAudioMessage = {
        guest_id: guestId,
        content: "Mensaje de voz",
        is_guest: true,
        is_audio: true,
        audio_url: publicUrlData.publicUrl
      };
      
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert([newAudioMessage])
        .select()
        .single();
        
      if (messageError) throw messageError;
      
      console.log("Mensaje de audio enviado exitosamente:", messageData);
      
      // Crear una versión tipada del mensaje
      const typedMessage: MessageType = {
        id: messageData.id,
        content: messageData.content,
        is_guest: messageData.is_guest,
        is_audio: messageData.is_audio,
        audio_url: messageData.audio_url,
        is_media: messageData.is_media || false,
        media_url: messageData.media_url,
        media_type: messageData.media_type as 'image' | 'video' | undefined,
        created_at: messageData.created_at || new Date().toISOString(),
      };
      
      // Actualizar mensajes locales
      setMessages(prev => prev.map(msg => 
        msg.id === localId ? typedMessage : msg
      ));
      
      // Remover de pendientes
      setPendingMessages(prev => prev.filter(msg => msg.localId !== localId));
      
      // Enviar notificación a recepción
      await sendNotificationToReception(formatMessageNotification(
        true,
        "Mensaje de voz",
        guestName,
        roomNumber,
        guestId
      ));
      
      return messageData;
    } catch (err) {
      console.error("Error en uploadAudio:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAudio = () => {
    // Simplemente resetear cualquier estado de audio
    console.log("Grabación de audio cancelada");
  };

  const handleCallStart = () => {
    setIsCallActive(true);
  };

  const handleCallEnd = () => {
    setIsCallActive(false);
  };

  const handleCloseNotificationPrompt = () => {
    setShowNotificationsPrompt(false);
  };

  // Obtener hora formateada para los mensajes
  const getFormattedTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Estado de conexión */}
      <div className={`absolute top-0 right-0 z-50 p-1 m-1 bg-white/80 rounded-full shadow-sm ${isRealtimeConnected ? 'bg-opacity-70' : 'bg-opacity-100'}`}>
        <ConnectionStatusIndicator variant="minimal" className="h-5 w-5" />
      </div>
      
      {/* Header */}
      <header className="bg-gradient-to-r from-hotel-700 to-hotel-500 p-3 text-white shadow-sm flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="mr-2 text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Recepción</h2>
          <p className="text-xs text-white/80">
            Cabaña {roomNumber} - {guestName}
          </p>
        </div>
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCallStart}
            className="text-white hover:bg-white/20"
          >
            <Phone className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Prompt de notificaciones */}
      {showNotificationsPrompt && (
        <NotificationPermissionRequest
          onDismiss={handleCloseNotificationPrompt}
        />
      )}

      {/* Chat content */}
      <div
        className="flex-grow overflow-y-auto p-4 bg-gray-50"
        ref={scrollContainerRef}
      >
        <div className="space-y-3 max-w-3xl mx-auto">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.is_guest ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg ${
                    msg.is_guest
                      ? "bg-gradient-to-r from-hotel-500 to-hotel-600 text-white"
                      : "bg-white border border-gray-200 text-gray-800"
                  }`}
                >
                  {msg.is_audio ? (
                    <AudioMessagePlayer
                      audioUrl={msg.audio_url || ""}
                      isGuest={msg.is_guest}
                      isDark={msg.is_guest}
                    />
                  ) : msg.is_media ? (
                    <MediaMessage
                      mediaUrl={msg.media_url || ""}
                      mediaType={msg.media_type || "image"}
                      isGuest={msg.is_guest}
                    />
                  ) : (
                    <p className="text-sm break-words">{msg.content}</p>
                  )}
                  <div className="mt-1 text-xs opacity-70 text-right">
                    {msg.id.startsWith('local') ? (
                      <span>Enviando...</span>
                    ) : (
                      getFormattedTime(msg.created_at)
                    )}
                  </div>
                </div>
                
                {/* Indicadores de estado para mensajes pendientes */}
                {msg.id.startsWith('local') && (
                  <div className="self-end ml-2">
                    {pendingMessages.find(pm => pm.localId === msg.id)?.status === 'sending' && (
                      <div className="h-2 w-2 bg-amber-400 rounded-full animate-pulse" title="Enviando..." />
                    )}
                    {pendingMessages.find(pm => pm.localId === msg.id)?.status === 'error' && (
                      <div className="h-2 w-2 bg-red-500 rounded-full" title="Error al enviar" />
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="p-3 bg-white border-t shadow-inner">
        <div className="flex items-center space-x-2">
          <AudioRecorder 
            onAudioRecorded={handleAudioRecorded}
            onCancel={handleCancelAudio}
            disabled={isLoading}
            title="Grabar mensaje de voz"
          />
          
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-grow"
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            disabled={isLoading}
          />
          
          <Button
            disabled={message.trim() === "" || isLoading}
            onClick={sendMessage}
            className="bg-hotel-600 hover:bg-hotel-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Call interface */}
      <AnimatePresence>
        {isCallActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-50"
          >
            <CallInterface
              isGuest={true}
              guestId={guestId}
              roomNumber={roomNumber}
              guestName={guestName}
              onClose={handleCallEnd}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GuestChat;
