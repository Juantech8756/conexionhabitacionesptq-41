import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Mic, MicOff, Send, Phone, Bell, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import AudioMessagePlayer from "@/components/AudioMessagePlayer";
import MediaMessage from "@/components/MediaMessage";
import MediaUploader from "@/components/MediaUploader";
import CallInterface from "@/components/CallInterface";
import { showGlobalAlert } from "@/hooks/use-alerts";
import { useNotifications } from "@/hooks/use-notifications";
import { sendNotificationToReception, formatMessageNotification } from "@/utils/notification";
import AudioRecorder from "@/components/AudioRecorder";
import { useRealtime } from "@/hooks/use-realtime";
import { RealtimeChannel } from "@supabase/supabase-js";

interface GuestChatProps {
  guestName: string;
  roomNumber: string;
  guestId: string;
  onBack: () => void;
}

// Define the MessageType type that was accidentally removed
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
  replaceLocalMessage?: boolean;
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

// Componente de indicador de escritura
const TypingIndicator = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;
  
  return (
    <div className="flex items-center space-x-1 text-gray-500 p-2 animate-in fade-in">
      <span className="text-xs">Recepción está escribiendo</span>
      <div className="flex space-x-1">
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.6s]"></div>
      </div>
    </div>
  );
};

const GuestChat = ({ guestName, roomNumber, guestId, onBack }: GuestChatProps) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [lastPollTime, setLastPollTime] = useState(Date.now());
  const [messageIdSet, setMessageIdSet] = useState<Set<string>>(new Set());
  const [shouldPoll, setShouldPoll] = useState(true);
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isReceptionTyping, setIsReceptionTyping] = useState(false);
  
  // Referencias
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Hooks
  const { toast } = useToast();
  const { permission, isSubscribed } = useNotifications({
    type: 'guest',
    guestId,
    roomNumber,
    roomId: roomId || undefined
  });

  // Use the useRealtime hook for better connection management
  const { isConnected: isRealtimeConnected } = useRealtime([
    {
      table: 'messages',
      event: 'INSERT',
      filter: 'guest_id',
      filterValue: guestId,
      callback: (payload) => {
        console.log('New message from realtime:', payload);
        
        // Handle realtime messages
        const newMsg = payload.new;
        if (newMsg) {
          // Use the more reliable mapping function
          const typedMessage = mapDatabaseMessageToTypedMessage(newMsg);
          
          // Only add if we don't already have this message ID
          if (!messageIdSet.has(typedMessage.id)) {
            console.log('Adding new message from realtime with ID:', typedMessage.id);
            
            // Primero verificamos si es un reemplazo para un mensaje optimista
            const isLocalMessageReplacement = Array.from(pendingMessages).some(
              pm => pm.status === 'sending' && typedMessage.content === pm.content
            );
            
            if (isLocalMessageReplacement) {
              // Si es un reemplazo, actualizamos el estado de los mensajes reemplazando el mensaje optimista
              setMessages(prev => {
                // Encontramos el mensaje optimista por contenido (más fiable que por ID en este caso)
                const localMsgIndex = prev.findIndex(
                  m => m.id.startsWith('local') && m.content === typedMessage.content
                );
                
                if (localMsgIndex >= 0) {
                  // Crear un nuevo array con el mensaje real reemplazando al optimista
                  const newMessages = [...prev];
                  newMessages[localMsgIndex] = typedMessage;
                  return newMessages;
                }
                
                // Si no encontramos el mensaje optimista, simplemente añadimos el nuevo
                return [...prev, typedMessage];
              });
              
              // También eliminamos el mensaje pendiente correspondiente
              setPendingMessages(prev => 
                prev.filter(pm => !(pm.content === typedMessage.content && pm.status === 'sending'))
              );
            } else {
              // Si no es un reemplazo, simplemente añadimos el mensaje
              setMessages(prev => {
                // Verificación adicional para evitar duplicados
                if (!prev.some(msg => msg.id === typedMessage.id)) {
                  return [...prev, typedMessage];
                }
                return prev;
              });
            }
            
            // Track this message ID
            setMessageIdSet(prev => {
              const newSet = new Set(prev);
              newSet.add(typedMessage.id);
              return newSet;
            });
            
            // Reset polling timer since we received a realtime message
            setLastPollTime(Date.now());
            
            // Temporarily disable polling for 10 seconds after receiving a realtime message
            setShouldPoll(false);
            setTimeout(() => setShouldPoll(true), 10000);
            
            // Scroll to bottom to show the new message
            setTimeout(() => scrollToBottom(true), 100);
          } else {
            console.log('Skipping duplicate message from realtime with ID:', typedMessage.id);
          }
        }
      }
    }
  ], `guest-chat-${guestId}`);

  // Effect to initialize the messageIdSet from existing messages
  useEffect(() => {
    const ids = new Set(messages.map(msg => msg.id));
    setMessageIdSet(ids);
  }, []);

  // Nueva actualización: Refresco automático cada 0.5 segundos
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      // Trigger refresh if needed - this will run every 500ms
      if (shouldPoll) {
        setNeedsRefresh(true);
      }
    }, 500); // Refresh every 500ms for more immediate updates
    
    return () => clearInterval(refreshInterval);
  }, [shouldPoll]);

  // Effect to handle the refresh when needed
  useEffect(() => {
    if (needsRefresh) {
      pollNewMessages();
      setNeedsRefresh(false);
    }
  }, [needsRefresh]);

  // Sistema de sondeo de respaldo para asegurar que se reciban mensajes
  useEffect(() => {
    // Only poll if polling is enabled and realtime is not connected
    // or if we explicitly allow polling
    const shouldPollNow = pollingEnabled && (shouldPoll || !isRealtimeConnected);
    
    const pollInterval = setInterval(() => {
      // Sólo sondeamos si hace más de 10 segundos del último sondeo
      // y si el sondeo está actualmente habilitado
      if (shouldPollNow && Date.now() - lastPollTime > 10000) {
        console.log("Polling for new messages...");
        pollNewMessages();
        setLastPollTime(Date.now());
      }
      
      // También reintentamos enviar mensajes pendientes
      retryPendingMessages();
      
    }, 15000); // Sondeo cada 15 segundos
    
    return () => clearInterval(pollInterval);
  }, [lastPollTime, pendingMessages, isRealtimeConnected, shouldPoll, pollingEnabled]);

  // Función para sondear mensajes nuevos con mejor manejo de duplicados
  const pollNewMessages = async () => {
    try {
      console.log("Sondeando mensajes nuevos...");
      
      if (!messages.length) return;
      
      // Obtenemos la fecha del último mensaje real (no optimista)
      const realMessages = messages.filter(m => !m.id.startsWith('local'));
      if (realMessages.length === 0) return;
      
      const latestMessageDate = new Date(realMessages[realMessages.length - 1]?.created_at || 0);
      
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
        
        // Transform the data using our mapping function
        const typedMessages: MessageType[] = data.map(mapDatabaseMessageToTypedMessage);
        
        // Filter out messages we already have (improved deduplication)
        const newMessages = typedMessages.filter(msg => {
          // No incluir si el ID ya está en nuestro set
          if (messageIdSet.has(msg.id)) return false;
          
          // También verificamos si ya existe en la lista actual de mensajes
          if (messages.some(m => m.id === msg.id)) return false;
          
          // Verificar si es un reemplazo para un mensaje optimista
          const isReplacement = messages.some(
            m => m.id.startsWith('local') && 
                m.content === msg.content && 
                m.is_guest === msg.is_guest
          );
          
          if (isReplacement) {
            // Si es un reemplazo, marcar para reemplazar en lugar de agregar
            msg.replaceLocalMessage = true;
          }
          
          return true;
        });
        
        if (newMessages.length > 0) {
          console.log(`Añadiendo ${newMessages.length} mensajes nuevos del sondeo`);
          
          // Actualizar mensajes locales con los nuevos mensajes únicos
          setMessages(prev => {
            // Primero manejamos los reemplazos
            let updatedMessages = [...prev];
            
            for (const newMsg of newMessages) {
              // Añadir mensaje normalmente si no es reemplazo
              if (!newMsg.replaceLocalMessage) continue;
              
              // Si es reemplazo, encontramos el mensaje optimista para reemplazar
              const localIndex = updatedMessages.findIndex(
                m => m.id.startsWith('local') && 
                    m.content === newMsg.content && 
                    m.is_guest === newMsg.is_guest
              );
              
              if (localIndex >= 0) {
                // Reemplazar el mensaje optimista con el real
                updatedMessages[localIndex] = newMsg;
                
                // Eliminar la propiedad temporal
                delete newMsg.replaceLocalMessage;
              }
            }
            
            // Ahora añadimos los mensajes que no son reemplazos
            const nonReplacements = newMessages.filter(msg => !msg.replaceLocalMessage);
            return [...updatedMessages, ...nonReplacements];
          });
          
          // Track these new message IDs
          setMessageIdSet(prev => {
            const newSet = new Set(prev);
            newMessages.forEach(msg => newSet.add(msg.id));
            return newSet;
          });
          
          // También eliminamos los mensajes pendientes correspondientes
          setPendingMessages(prev => 
            prev.filter(pm => !newMessages.some(
              nm => nm.content === pm.content && pm.status === 'sending'
            ))
          );
          
          // Scroll hacia abajo para mostrar los nuevos mensajes
          setTimeout(() => scrollToBottom(true), 100);
        } else {
          console.log('No se encontraron mensajes nuevos después de filtrar duplicados');
        }
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
        await uploadMedia(messageToRetry.localId, messageToRetry.mediaFile);
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
      
      // Ya no necesitamos mostrar el prompt de notificaciones aquí
      // ya que tenemos el banner global
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Scroll to newest messages - sin referencia a isMobile
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end"
      });
    }
  };

  // Function to map database message to correct MessageType with proper type validation
  const mapDatabaseMessageToTypedMessage = (dbMessage: any): MessageType => {
    return {
      id: dbMessage.id,
      content: dbMessage.content,
      is_guest: dbMessage.is_guest,
      is_audio: dbMessage.is_audio,
      audio_url: dbMessage.audio_url,
      is_media: dbMessage.is_media || false,
      media_url: dbMessage.media_url,
      // Ensure media_type is always one of the allowed values
      media_type: dbMessage.media_type === 'image' || dbMessage.media_type === 'video' 
        ? dbMessage.media_type as 'image' | 'video'
        : undefined,
      created_at: dbMessage.created_at || new Date().toISOString(),
    };
  };

  // Fetch messages on initial load with improved duplicate handling
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
          
          // Add welcome message to tracked IDs
          setMessageIdSet(new Set(['welcome']));
        } else {
          // Transform using our mapping function
          const typedMessages: MessageType[] = data.map(mapDatabaseMessageToTypedMessage);
          
          // Create a set of the IDs for faster lookups
          const idSet = new Set(typedMessages.map(m => m.id));
          setMessageIdSet(idSet);
          
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
  
  // Handle file selection for media upload
  const handleFileSelect = (file: File | null) => {
    console.log("Archivo seleccionado:", file);
    setSelectedFile(file);
  };
  
  // Enviar mensaje de texto
  const sendMessage = async () => {
    // Verificamos si hay un mensaje de texto o un archivo para enviar
    if (message.trim() === "" && !selectedFile) return;
    
    // Si hay un archivo seleccionado, lo enviamos
    if (selectedFile) {
      await handleSendMedia();
      return;
    }
    
    // Si llegamos aquí, solo hay mensaje de texto
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
    
    // Track this optimistic message ID to avoid duplicates later
    setMessageIdSet(prev => {
      const newSet = new Set(prev);
      newSet.add(localId);
      return newSet;
    });
    
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
  
  // Handle media sending
  const handleSendMedia = async () => {
    if (!selectedFile || !guestId) return;
    
    const localId = `local-media-${Date.now()}`;
    const mediaType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
    const fileDescription = mediaType === 'image' ? 'Imagen' : 'Video';
    
    // Agregar mensaje optimista a la UI
    const optimisticMessage: MessageType = {
      id: localId,
      content: `${fileDescription} enviado`,
      is_guest: true,
      is_audio: false,
      is_media: true,
      media_type: mediaType,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Track this optimistic message ID
    setMessageIdSet(prev => {
      const newSet = new Set(prev);
      newSet.add(localId);
      return newSet;
    });
    
    // Agregar a pendientes
    setPendingMessages(prev => [
      ...prev, 
      {
        localId,
        type: 'media',
        content: `${fileDescription} enviado`,
        mediaFile: selectedFile,
        status: 'sending',
        retryCount: 0
      }
    ]);
    
    // Scroll hacia abajo
    setTimeout(() => scrollToBottom(true), 100);
    
    try {
      await uploadMedia(localId, selectedFile);
      // Limpiar archivo seleccionado después de enviar
      setSelectedFile(null);
    } catch (error) {
      console.error("Error uploading media:", error);
      
      // Marcar como error para reintentar
      setPendingMessages(prev => prev.map(msg => 
        msg.localId === localId 
          ? { ...msg, status: 'error' }
          : msg
      ));
      
      toast({
        title: "Error",
        description: `No se pudo enviar el ${fileDescription.toLowerCase()}. Se reintentará automáticamente.`,
        variant: "destructive"
      });
    }
  };
  
  // Función para subir multimedia al servidor
  const uploadMedia = async (localId: string, file: File) => {
    if (!guestId) return;
    
    setIsLoading(true);
    
    try {
      // Determinar el tipo de archivo
      const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
      // Usar el bucket chat_media en lugar de media_messages
      const bucketName = 'chat_media';
      const fileExtension = file.name.split('.').pop();
      const fileName = `${mediaType}_${Date.now()}_guest.${fileExtension}`;
      
      // Subir a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from(bucketName)
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: publicUrlData } = supabase
        .storage
        .from(bucketName)
        .getPublicUrl(fileName);

      const fileDescription = mediaType === 'image' ? 'Imagen enviada' : 'Video enviado';
        
      // Agregar mensaje con multimedia
      const newMediaMessage = {
        guest_id: guestId,
        content: fileDescription,
        is_guest: true,
        is_audio: false,
        is_media: true,
        media_url: publicUrlData.publicUrl,
        media_type: mediaType
      };
      
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert([newMediaMessage])
        .select()
        .single();
        
      if (messageError) throw messageError;
      
      console.log("Mensaje multimedia enviado exitosamente:", messageData);
      
      // Usar la función de mapeo para asegurar la tipificación correcta
      const typedMessage = mapDatabaseMessageToTypedMessage(messageData);
      
      // Track the real message ID instead of the local one
      setMessageIdSet(prev => {
        const newSet = new Set(prev);
        newSet.add(typedMessage.id);
        // We keep the localId to avoid duplicating the message if it comes back via realtime
        return newSet;
      });
      
      // Actualizar mensajes locales
      setMessages(prev => prev.map(msg => 
        msg.id === localId ? typedMessage : msg
      ));
      
      // Remover de pendientes
      setPendingMessages(prev => prev.filter(msg => msg.localId !== localId));
      
      // Enviar notificación a recepción
      await sendNotificationToReception(formatMessageNotification(
        true,
        fileDescription,
        guestName,
        roomNumber,
        guestId
      ));
      
      return messageData;
    } catch (err) {
      console.error("Error en uploadMedia:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para enviar mensaje al servidor
  const sendMessageToServer = async (localId: string, messageText: string) => {
    try {
      // Primero verificamos si este mensaje ya fue enviado para evitar duplicados
      if (!messageIdSet.has(localId)) {
        console.error("Mensaje local no encontrado, posible estado inconsistente");
        return;
      }
      
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
      
      const typedMessage = mapDatabaseMessageToTypedMessage(data);
      
      // Track the real message ID
      setMessageIdSet(prev => {
        const newSet = new Set(prev);
        newSet.add(typedMessage.id);
        return newSet;
      });
      
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
    
    // Track this optimistic message ID
    setMessageIdSet(prev => {
      const newSet = new Set(prev);
      newSet.add(localId);
      return newSet;
    });
    
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
      
      // Usar la función de mapeo para asegurar la tipificación correcta
      const typedMessage = mapDatabaseMessageToTypedMessage(messageData);
      
      // Track the real message ID instead of the local one
      setMessageIdSet(prev => {
        const newSet = new Set(prev);
        newSet.add(typedMessage.id);
        // We keep the localId to prevent duplicates
        return newSet;
      });
      
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

  // Obtener hora formateada para los mensajes
  const getFormattedTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Toggle polling function for debugging if needed
  const togglePolling = () => {
    setPollingEnabled(prev => !prev);
    toast({
      title: pollingEnabled ? "Polling desactivado" : "Polling activado",
      description: pollingEnabled 
        ? "No se buscarán mensajes periódicamente" 
        : "Se buscarán mensajes periódicamente",
      duration: 3000
    });
  };

  // Suscripción al canal de typing
  useEffect(() => {
    if (!guestId) return;
    
    // Crear un canal específico para los eventos de typing
    const typingChannel = supabase.channel(`typing-${guestId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.guestId === guestId) {
          setIsReceptionTyping(payload.payload.isTyping);
          
          // Desactivar el indicador después de 3 segundos si no se reciben más eventos
          if (payload.payload.isTyping) {
            setTimeout(() => {
              setIsReceptionTyping(false);
            }, 3000);
          }
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, [guestId]);
  
  // Enviar evento de typing cuando el huésped escribe
  useEffect(() => {
    if (!guestId || !message.trim()) return;
    
    // Enviar evento de typing
    const sendTypingEvent = async () => {
      await supabase.channel(`typing-reception`)
        .send({
          type: 'broadcast',
          event: 'typing',
          payload: { 
            guestId,
            isTyping: true,
            guestName,
            roomNumber
          }
        });
    };
    
    sendTypingEvent();
  }, [message, guestId, guestName, roomNumber]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden chat-container chat-background layout-fullwidth">
      {/* Header de información */}
      <header className="dashboard-header-container" style={{
        height: '80px',
        width: '100%',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(to right, #115e45, #1a7f64)',
        color: 'white',
        opacity: 1,
        visibility: 'visible'
      }}>
        <div className="flex items-center justify-between h-20 px-6 md:px-8 w-full">
          <div className="flex items-center">
            <div className="flex items-center">
              <h1 className="text-2xl font-semibold">Recepción</h1>
              <span className="ml-4 text-base text-white/90 hidden sm:inline-block">
                Servicio de Habitaciones
              </span>
            </div>
          </div>
          <Button 
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-full"
            onClick={() => alert("¡Botón de prueba funcionando!")}
          >
            Prueba
          </Button>
        </div>
      </header>

      {/* Header minimalista */}
      <header className="chat-header-minimal" style={{ top: '80px' }}>
        <div className="flex items-center gap-1.5 w-full px-3 justify-between">
          <div className="flex items-center">
            <div>
              <h2 className="text-sm font-medium leading-tight">Recepción</h2>
              <p className="text-[10px] text-white/70">
                {roomNumber} · {guestName}
              </p>
            </div>
          </div>
          
          {/* Botón de llamada a la derecha */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCallStart}
            className="h-8 w-8 p-0 text-white hover:bg-white/20 rounded-full"
            title="Llamar a recepción"
          >
            <Phone className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Contenido del chat */}
      <div 
        className="messages-area ios-scroll-fix"
        ref={scrollContainerRef}
        style={{ paddingTop: '140px' }} /* Ajustado para considerar ambos headers */
      >
        <div className="space-y-2 max-w-none w-full px-3 pb-2">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 0.2,
                  delay: msg.id.startsWith('local') ? 0 : Math.min(0.05 * (index % 3), 0.1)
                }}
                className={`flex w-full ${msg.is_guest ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`p-2 ${
                    msg.is_guest
                      ? "chat-bubble-guest"
                      : "chat-bubble-reception"
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
                  <div className="mt-0.5 text-[10px] opacity-70 text-right">
                    {msg.id.startsWith('local') ? (
                      <span>Enviando...</span>
                    ) : (
                      getFormattedTime(msg.created_at)
                    )}
                  </div>
                </div>
                
                {/* Indicadores de estado */}
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
          
          {/* Indicador de escritura */}
          {isReceptionTyping && (
            <div className="flex items-center space-x-1 text-gray-500 p-2 animate-in fade-in w-full">
              <span className="text-xs">Recepción está escribiendo</span>
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.6s]"></div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Área de input */}
      <div className="chat-input-bar w-full" style={{ bottom: '0', position: 'fixed' }}>
        <div className="flex items-center gap-1.5 w-full">
          <AudioRecorder 
            onAudioRecorded={handleAudioRecorded}
            onCancel={handleCancelAudio}
            disabled={isLoading}
            title="Grabar mensaje de voz"
            className="h-9 w-9 p-0 rounded-full border-gray-300 text-hotel-700 hover:bg-gray-100 flex-shrink-0"
          />
          
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-grow h-9 rounded-full text-sm py-1.5 px-3 bg-gray-100 border-gray-200 focus-visible:ring-hotel-500"
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            disabled={isLoading}
          />
          
          <MediaUploader
            guestId={guestId}
            onUploadComplete={() => {}}
            disabled={isLoading}
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            className="h-9 w-9 p-0 rounded-full border-gray-300 text-hotel-700 hover:bg-gray-100 flex-shrink-0"
          />
          
          <Button
            disabled={(message.trim() === "" && !selectedFile) || isLoading}
            onClick={sendMessage}
            className={`h-9 w-9 p-0 rounded-full flex items-center justify-center flex-shrink-0 ${(message.trim() !== "" || selectedFile) ? "bg-hotel-700 hover:bg-hotel-800" : "bg-gray-300"}`}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Interfaz de llamada */}
      <AnimatePresence>
        {isCallActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            className="absolute inset-0 z-50 w-full h-full"
            style={{ top: '80px' }} /* Ajustar para considerar el header de información */
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
