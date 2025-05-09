import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, MessageCircle, Mic, MicOff, Send, Bell, ArrowLeft, Menu, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile"; 
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import AudioMessagePlayer from "@/components/AudioMessagePlayer";
import MediaMessage from "@/components/MediaMessage";
import MediaUploader from "@/components/MediaUploader";

type Guest = {
  id: string;
  name: string;
  room_number: string;
  room_id: string | null;
  last_activity: string;
  unread_messages: number;
  wait_time_minutes: number | null;
};

type Room = {
  id: string;
  room_number: string;
  status: string;
  floor: string | null;
  type: string | null;
};

type Message = {
  id: string;
  guest_id: string;
  content: string;
  is_guest: boolean;
  is_audio: boolean;
  audio_url?: string;
  created_at: string;
  responded_at: string | null;
  response_time: number | null;
  is_media?: boolean;
  media_url?: string;
  media_type?: 'image' | 'video';
};

interface ReceptionDashboardProps {
  onCallGuest?: (guest: { id: string; name: string; roomNumber: string }) => void;
}

const ReceptionDashboard = ({ onCallGuest }: ReceptionDashboardProps) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const [showGuestList, setShowGuestList] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? "smooth" : "auto", 
        block: "end" 
      });
    }
  };

  // Load rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*');
        
        if (error) throw error;

        const roomsMap: Record<string, Room> = {};
        data?.forEach(room => {
          roomsMap[room.id] = room;
        });

        setRooms(roomsMap);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      }
    };
    
    fetchRooms();
    
    // Subscribe to room changes
    const roomsChannel = supabase
      .channel('public:rooms')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rooms' },
        fetchRooms
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(roomsChannel);
    };
  }, []);

  // Force refresh guest statistics after a staff reply to properly update wait times
  const refreshGuestStatistics = async () => {
    try {
      // Join guests and response_statistics to get updated wait times
      const { data: statsData, error: statsError } = await supabase
        .from('response_statistics')
        .select('guest_id, guest_name, room_number, pending_messages, wait_time_minutes');

      if (statsError) throw statsError;
      
      // Create a map of response statistics by guest_id
      const statsMap: Record<string, any> = {};
      statsData?.forEach(stat => {
        statsMap[stat.guest_id] = stat;
      });

      // Update existing guests with new statistics
      setGuests(prevGuests => 
        prevGuests.map(guest => {
          const guestStats = statsMap[guest.id] || {};
          return {
            ...guest,
            unread_messages: guestStats.pending_messages || 0,
            wait_time_minutes: guestStats.wait_time_minutes || 0
          };
        })
      );

      // Also update the selected guest if needed
      if (selectedGuest) {
        const updatedStats = statsMap[selectedGuest.id] || {};
        setSelectedGuest(prev => prev ? {
          ...prev,
          unread_messages: updatedStats.pending_messages || 0,
          wait_time_minutes: updatedStats.wait_time_minutes || 0
        } : null);
      }
    } catch (error) {
      console.error("Error refreshing guest statistics:", error);
    }
  };

  // Load guests with response stats
  useEffect(() => {
    const fetchGuests = async () => {
      try {
        // Join guests and response_statistics to get wait times
        const { data: statsData, error: statsError } = await supabase
          .from('response_statistics')
          .select('guest_id, guest_name, room_number, pending_messages, wait_time_minutes');

        if (statsError) throw statsError;

        // Get all guests
        const { data: guestsData, error: guestsError } = await supabase
          .from('guests')
          .select('id, name, room_number, room_id, created_at');
        
        if (guestsError) throw guestsError;

        if (!guestsData) return;
        
        // Create a map of response statistics by guest_id
        const statsMap: Record<string, any> = {};
        statsData?.forEach(stat => {
          statsMap[stat.guest_id] = stat;
        });
        
        // For each guest, get the latest message timestamp and unread count
        const enhancedGuests = await Promise.all(
          guestsData.map(async (guest) => {
            // Get latest message timestamp
            const { data: latestMessage } = await supabase
              .from('messages')
              .select('created_at')
              .eq('guest_id', guest.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            // Get stats from the stats map
            const guestStats = statsMap[guest.id] || {};
            
            return {
              ...guest,
              last_activity: latestMessage?.created_at || guest.created_at,
              unread_messages: guestStats.pending_messages || 0,
              wait_time_minutes: guestStats.wait_time_minutes || 0
            };
          })
        );
        
        // Sort by last activity
        enhancedGuests.sort((a, b) => 
          new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
        );
        
        setGuests(enhancedGuests);
      } catch (error) {
        console.error("Error fetching guests:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los huéspedes",
          variant: "destructive",
        });
      }
    };
    
    fetchGuests();
    
    // Subscribe to new guests
    const guestsChannel = supabase
      .channel('public:guests')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'guests' },
        fetchGuests
      )
      .subscribe();
    
    // Subscribe to new messages (to update unread counts)
    const messagesChannel = supabase
      .channel('public:messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        payload => {
          // Only update wait times for guest messages
          if ((payload.new as any).is_guest) {
            fetchGuests();
          }
        }
      )
      .subscribe();
    
    // Subscribe to message updates (to track when messages are responded to)
    const messageUpdatesChannel = supabase
      .channel('public:message_updates')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => {
          // When messages are marked as responded to, refresh statistics
          refreshGuestStatistics();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(guestsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(messageUpdatesChannel);
    };
  }, [toast]);

  // Load messages for selected guest
  useEffect(() => {
    if (!selectedGuest) return;
    
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('guest_id', selectedGuest.id)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        // Cast data to ensure it matches Message type
        const typedMessages = data.map(msg => ({
          ...msg,
          media_type: msg.media_type as 'image' | 'video' | undefined
        }));
        
        setMessages(prev => ({
          ...prev,
          [selectedGuest.id]: typedMessages as Message[]
        }));

        // Scroll to bottom after messages are loaded - use a delay to ensure DOM is updated
        setTimeout(() => scrollToBottom(false), 100);
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los mensajes",
          variant: "destructive",
        });
      }
    };
    
    fetchMessages();
    
    // Subscribe to new messages for this guest
    const channel = supabase
      .channel(`guest-${selectedGuest.id}-messages`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `guest_id=eq.${selectedGuest.id}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => ({
            ...prev,
            [selectedGuest.id]: [...(prev[selectedGuest.id] || []), newMessage]
          }));
          
          // Mark previous messages as responded if this is a staff reply
          if (!newMessage.is_guest) {
            updateResponseStatus(selectedGuest.id);
          }
          
          // Update unread count for guests
          setGuests(prev => 
            prev.map(g => {
              if (g.id === selectedGuest.id && (payload.new as any).is_guest) {
                return { ...g, unread_messages: g.unread_messages + 1 };
              }
              return g;
            })
          );
          
          // Scroll to bottom when new message arrives
          setTimeout(() => scrollToBottom(true), 100);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGuest, toast]);

  // Update response status for messages when staff replies
  const updateResponseStatus = async (guestId: string) => {
    const now = new Date().toISOString();
    try {
      // Find all unreplied guest messages
      const { data: pendingMessages, error: fetchError } = await supabase
        .from('messages')
        .select('id, created_at')
        .eq('guest_id', guestId)
        .eq('is_guest', true)
        .is('responded_at', null);
      
      if (fetchError) throw fetchError;
      
      if (!pendingMessages || pendingMessages.length === 0) return;
      
      // Update each message with response time
      for (const msg of pendingMessages) {
        // Calculate response time in seconds
        const createdAt = new Date(msg.created_at);
        const responseTime = Math.round((new Date().getTime() - createdAt.getTime()) / 1000);
        
        // Update the message
        await supabase
          .from('messages')
          .update({
            responded_at: now,
            response_time: responseTime
          })
          .eq('id', msg.id);
      }

      // Force refresh wait times from response_statistics
      setTimeout(() => {
        refreshGuestStatistics();
      }, 500);

      // Immediately reset wait time in local state - this provides instant UI feedback
      if (selectedGuest && selectedGuest.id === guestId) {
        setSelectedGuest(prev => prev ? { ...prev, wait_time_minutes: 0 } : null);
      }

      // Also update the guest in the guests list
      setGuests(prevGuests => 
        prevGuests.map(g => 
          g.id === guestId ? { ...g, wait_time_minutes: 0 } : g
        )
      );
    } catch (error) {
      console.error("Error updating response status:", error);
    }
  };

  const selectGuest = (guest: Guest) => {
    setSelectedGuest(guest);
    // Mark messages as read (for UI purposes, no actual read status in DB)
    setGuests(prevGuests => 
      prevGuests.map(g => 
        g.id === guest.id ? { ...g, unread_messages: 0 } : g
      )
    );
    if (isMobile) {
      setShowGuestList(false);
    }
  };

  const handleBackToGuestList = () => {
    if (isMobile) {
      setSelectedGuest(null);
    }
  };

  const handleCallGuest = () => {
    if (selectedGuest && onCallGuest) {
      onCallGuest({
        id: selectedGuest.id,
        name: selectedGuest.name,
        roomNumber: selectedGuest.room_number
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString);
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "Ahora mismo";
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    return date.toLocaleDateString('es');
  };

  // New function to check if there's a selected file to upload
  const handleSend = async () => {
    if (selectedFile) {
      // If there's a file pending upload, upload it first
      await handleFileUpload();
    } else if (replyText.trim() !== "") {
      // Otherwise send a text message if there's text
      await sendReply();
    }
  };

  const setSelectedMedia = (file: File | null) => {
    setSelectedFile(file);
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedGuest) return;
    
    setIsLoading(true);
    showGlobalAlert({
      title: "Subiendo archivo",
      description: "Por favor espere mientras se sube el archivo...",
      duration: 2000
    });

    try {
      // Determine file type
      const fileType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
      
      // Create folder structure: media/{guestId}/{fileType}s/
      const fileName = `${Date.now()}_${selectedFile.name.replace(/\s+/g, '_')}`;
      const filePath = `media/${selectedGuest.id}/${fileType}s/${fileName}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase
        .storage
        .from('chat_media')
        .upload(filePath, selectedFile);

      if (error) throw error;

      // Get public URL for the uploaded file
      const { data: publicUrlData } = supabase
        .storage
        .from('chat_media')
        .getPublicUrl(filePath);

      // Create a new media message
      const newMessage = {
        guest_id: selectedGuest.id,
        content: fileType === 'image' ? "Imagen compartida" : "Video compartido",
        is_guest: false,
        is_audio: false,
        is_media: true,
        media_url: publicUrlData.publicUrl,
        media_type: fileType
      };
      
      const { error: msgError } = await supabase
        .from('messages')
        .insert([newMessage]);
      
      if (msgError) throw msgError;
      
      // Mark all pending messages as responded
      await updateResponseStatus(selectedGuest.id);
      
      // Reset wait time in the UI
      setSelectedGuest(prev => prev ? { ...prev, wait_time_minutes: 0 } : null);
      
      setGuests(prevGuests => 
        prevGuests.map(g => 
          g.id === selectedGuest.id ? { ...g, wait_time_minutes: 0 } : g
        )
      );

      // Force refresh guest statistics
      setTimeout(() => {
        refreshGuestStatistics();
      }, 500);

      toast({
        title: "Archivo enviado",
        description: "El archivo se ha enviado correctamente."
      });
      
      // Reset states
      setSelectedFile(null);
      
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error al subir archivo",
        description: "No se pudo enviar el archivo. Intente de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendReply = async () => {
    if (replyText.trim() === "" || !selectedGuest || isLoading) return;
    
    setIsLoading(true);
    
    try {
      // 1. Add the new message from reception staff
      const newMessage = {
        guest_id: selectedGuest.id,
        content: replyText,
        is_guest: false,
        is_audio: false
      };
      
      const { error } = await supabase
        .from('messages')
        .insert([newMessage]);
      
      if (error) throw error;
      
      setReplyText("");
      
      // 2. Mark all pending messages as responded
      await updateResponseStatus(selectedGuest.id);
      
      // 3. Immediately reset wait time in the local UI for better UX feedback
      setSelectedGuest(prev => prev ? { ...prev, wait_time_minutes: 0 } : null);
      
      setGuests(prevGuests => 
        prevGuests.map(g => 
          g.id === selectedGuest.id ? { ...g, wait_time_minutes: 0 } : g
        )
      );

      // 4. Force refresh guest statistics to ensure wait time is properly reset
      setTimeout(() => {
        refreshGuestStatistics();
      }, 500);
    } catch (error) {
      console.error("Error sending reply:", error);
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
    if (!selectedGuest) return;
    
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
          
          // Upload to Supabase Storage
          const fileName = `audio_${Date.now()}_reception.webm`;
          const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('audio_messages')
            .upload(fileName, audioBlob);
          
          if (uploadError) throw uploadError;
          
          // Get public URL
          const { data: publicUrlData } = supabase
            .storage
            .from('audio_messages')
            .getPublicUrl(fileName);
          
          // Add message with audio
          const newAudioMessage = {
            guest_id: selectedGuest.id,
            content: "Mensaje de voz",
            is_guest: false,
            is_audio: true,
            audio_url: publicUrlData.publicUrl
          };
          
          const { error: messageError } = await supabase
            .from('messages')
            .insert([newAudioMessage]);
          
          if (messageError) throw messageError;

          // Mark all pending messages as responded
          await updateResponseStatus(selectedGuest.id);
          
          // Immediately reset wait time in UI
          setSelectedGuest(prev => prev ? { ...prev, wait_time_minutes: 0 } : null);
          
          setGuests(prevGuests => 
            prevGuests.map(g => 
              g.id === selectedGuest.id ? { ...g, wait_time_minutes: 0 } : g
            )
          );
          
          // Force refresh statistics to ensure wait time is properly updated
          setTimeout(() => {
            refreshGuestStatistics();
          }, 500);
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

  // Handle media upload completion
  const handleMediaUploadComplete = async (mediaUrl: string, mediaType: 'image' | 'video') => {
    if (!selectedGuest) return;
    
    try {
      // Create a new media message
      const newMessage = {
        guest_id: selectedGuest.id,
        content: mediaType === 'image' ? "Imagen compartida" : "Video compartido",
        is_guest: false,
        is_audio: false,
        is_media: true,
        media_url: mediaUrl,
        media_type: mediaType
      };
      
      const { error } = await supabase
        .from('messages')
        .insert([newMessage]);
      
      if (error) throw error;
      
      // Mark all pending messages as responded
      await updateResponseStatus(selectedGuest.id);
      
      // Reset wait time in the UI for better UX feedback
      setSelectedGuest(prev => prev ? { ...prev, wait_time_minutes: 0 } : null);
      
      setGuests(prevGuests => 
        prevGuests.map(g => 
          g.id === selectedGuest.id ? { ...g, wait_time_minutes: 0 } : g
        )
      );

      // Force refresh guest statistics
      setTimeout(() => {
        refreshGuestStatistics();
      }, 500);
    } catch (error) {
      console.error("Error sending media message:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje multimedia",
        variant: "destructive",
      });
    }
  };

  // Get room info if available
  const getRoomInfo = (guest: Guest) => {
    if (guest.room_id && rooms[guest.room_id]) {
      const room = rooms[guest.room_id];
      return (
        <div className="flex flex-col mt-1">
          <div className="text-xs text-gray-500">
            {room.type && <span className="mr-2">{room.type === 'family' ? 'Cabaña familiar' : room.type === 'couple' ? 'Cabaña pareja' : room.type}</span>}
            {room.floor && <span>Piso {room.floor}</span>}
          </div>
        </div>
      );
    }
    return null;
  };

  // Mobile layout with sliding panels
  if (isMobile) {
    return (
      <div className="flex h-full bg-gray-100 relative">
        <AnimatePresence initial={false}>
          {!selectedGuest ? (
            <motion.div 
              key="guest-list"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full bg-white"
            >
              <div className="p-4 gradient-header flex items-center">
                <h2 className="text-lg font-semibold flex items-center text-white">
                  <User className="mr-2 h-5 w-5" />
                  Huéspedes
                </h2>
              </div>
              
              <ScrollArea className="h-[calc(100%-64px)]">
                <AnimatePresence>
                  {guests.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 text-gray-500 text-center"
                    >
                      No hay huéspedes registrados
                    </motion.div>
                  ) : (
                    guests.map((guest) => (
                      <motion.div
                        key={guest.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
                          selectedGuest?.id === guest.id ? "bg-blue-50 border-l-4 border-l-hotel-600" : ""
                        }`}
                        onClick={() => selectGuest(guest)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium flex items-center flex-wrap">
                              {guest.name} 
                              <span className="ml-2 text-sm text-gray-500">
                                Cabaña {guest.room_number}
                              </span>
                            </p>
                            {getRoomInfo(guest)}
                            <p className="text-xs text-gray-500 mt-1">
                              {formatLastActivity(guest.last_activity)}
                            </p>
                          </div>
                          {guest.unread_messages > 0 && (
                            <motion.div 
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              className="bg-hotel-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs shadow-md"
                            >
                              {guest.unread_messages}
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </ScrollArea>
            </motion.div>
          ) : (
            <motion.div 
              key="chat-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col w-full h-full bg-gray-50"
            >
              <header className="bg-gradient-to-r from-hotel-600 to-hotel-500 p-3 text-white shadow-sm">
                <div className="flex items-center justify-between">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="mr-2 text-white hover:bg-white/20"
                    onClick={handleBackToGuestList}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex-grow">
                    <h2 className="text-base font-semibold">{selectedGuest.name}</h2>
                    <p className="text-xs text-white/90">
                      Cabaña {selectedGuest.room_number}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCallGuest}
                    className="text-white hover:bg-white/20"
                    title="Llamar a huésped"
                  >
                    <Phone className="h-5 w-5" />
                  </Button>
                </div>
              </header>

              <div className="flex-grow overflow-auto p-2" ref={scrollContainerRef}>
                <div className="space-y-3">
                  <AnimatePresence>
                    {messages[selectedGuest.id]?.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${msg.is_guest ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[85%] p-3 rounded-lg ${
                            msg.is_guest 
                              ? 'bg-white border border-gray-200 text-gray-800' 
                              : 'bg-gradient-to-r from-hotel-600 to-hotel-500 text-white'
                          }`}
                        >
                          {msg.is_audio ? (
                            <AudioMessagePlayer 
                              audioUrl={msg.audio_url || ''} 
                              isGuest={!msg.is_guest} 
                              isDark={!msg.is_guest}
                            />
                          ) : (
                            <p className="text-sm break-words">{msg.content}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              </div>

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
                    guestId={selectedGuest.id} 
                    onUploadComplete={handleMediaUploadComplete} 
                    disabled={isRecording || isLoading} 
                  />
                  
                  <Input
                    placeholder="Escriba su respuesta..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                    className="flex-grow shadow-sm text-sm"
                    disabled={isRecording || isLoading}
                  />
                  
                  <Button
                    type="button"
                    onClick={sendReply}
                    disabled={replyText.trim() === "" || isRecording || isLoading}
                    className="flex-shrink-0 bg-gradient-to-r from-hotel-600 to-hotel-500 hover:from-hotel-700 hover:to-hotel-600"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop layout 
  return (
    <div className="flex h-full bg-gray-100">
      <div className="w-full h-full flex overflow-hidden">
        {/* Lista de huéspedes (desktop) */}
        <div className="w-1/4 border-r bg-white overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-gradient-to-r from-hotel-700 to-hotel-500 text-white">
            <h2 className="text-xl font-semibold flex items-center">
              <User className="mr-2 h-5 w-5" />
              Huéspedes
            </h2>
          </div>
          
          <div className="flex-grow overflow-auto">
            <ScrollArea className="h-full">
              <AnimatePresence>
                {guests.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 text-gray-500 text-center"
                  >
                    No hay huéspedes registrados
                  </motion.div>
                ) : (
                  guests.map((guest) => (
                    <motion.div
                      key={guest.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors duration-200 ${
                        selectedGuest?.id === guest.id ? "bg-blue-50 border-l-4 border-l-hotel-600" : ""
                      }`}
                      onClick={() => selectGuest(guest)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium flex items-center">
                            {guest.name} 
                            <span className="ml-2 text-sm text-gray-500">
                              Cabaña {guest.room_number}
                            </span>
                          </p>
                          {getRoomInfo(guest)}
                          <p className="text-xs text-gray-500 mt-1">
                            {formatLastActivity(guest.last_activity)}
                          </p>
                        </div>
                        {guest.unread_messages > 0 && (
                          <motion.div 
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className="bg-hotel-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs shadow-md"
                          >
                            {guest.unread_messages}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </ScrollArea>
          </div>
        </div>

        {/* Panel de mensajes (desktop) */}
        <div className="flex-grow flex flex-col bg-gray-50 overflow-hidden">
          {selectedGuest ? (
            <>
              <header className="bg-gradient-to-r from-hotel-600 to-hotel-500 p-4 text-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedGuest.name}</h2>
                    <p className="text-sm text-white/90 flex items-center">
                      Cabaña {selectedGuest.room_number}
                    </p>
                    {selectedGuest.room_id && rooms[selectedGuest.room_id] && (
                      <div className="text-xs text-white/80 mt-1">
                        {rooms[selectedGuest.room_id].type && (
                          <span className="mr-3">
                            Tipo: {rooms[selectedGuest.room_id].type === 'family' 
                              ? 'Cabaña familiar' 
                              : rooms[selectedGuest.room_id].type === 'couple' 
                                ? 'Cabaña pareja' 
                                : rooms[selectedGuest.room_id].type}
                          </span>
                        )}
                        {rooms[selectedGuest.room_id].floor && (
                          <span>Piso: {rooms[selectedGuest.room_id].floor}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCallGuest}
                      className="bg-white/20 hover:bg-white/30 text-white border-none"
                    >
                      <Phone className="h-4 w-4 mr-1" /> Llamar
                    </Button>
                    <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-none">
                      <Bell className="h-4 w-4 mr-1" /> Notificar
                    </Button>
                  </div>
                </div>
              </header>

              <div className="flex-grow overflow-auto">
                <div className="h-full p-4">
                  <div className="space-y-4">
                    <AnimatePresence>
                      {messages[selectedGuest.id]?.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`flex ${msg.is_guest ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg shadow-sm ${
                              msg.is_guest 
                                ? 'bg-white border border-gray-200 text-gray-800' 
                                : 'bg-gradient-to-r from-hotel-600 to-hotel-500 text-white'
                            } ${msg.is_audio || msg.is_media ? 'overflow-hidden p-0' : 'p-3'}`}
                          >
                            {msg.is_audio ? (
                              <AudioMessagePlayer 
                                audioUrl={msg.audio_url || ''} 
                                isGuest={msg.is_guest} 
                                isDark={!msg.is_guest}
                              />
                            ) : msg.is_media ? (
                              <MediaMessage
                                mediaUrl={msg.media_url || ''}
                                mediaType={msg.media_type || 'image'}
                                isGuest={msg.is_guest}
                              />
                            ) : (
                              <p>{msg.content}</p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t bg-white shadow-inner">
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={toggleRecording}
                    className={`flex-shrink-0 transition-colors duration-200 ${isRecording ? 'bg-red-100 text-red-600 border-red-300 animate-pulse' : ''}`}
                    disabled={isLoading}
                  >
                    {isRecording ? (
                      <MicOff className="h-5 w-5" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </Button>
                  
                  <MediaUploader 
                    guestId={selectedGuest.id} 
                    onUploadComplete={handleMediaUploadComplete}
                    disabled={isRecording || isLoading}
                  />
                  
                  <Input
                    placeholder="Escriba su respuesta..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                    className="flex-grow shadow-sm focus:ring-2 focus:ring-hotel-500/50 transition-all duration-200"
                    disabled={isRecording || isLoading}
                  />
                  
                  <Button
                    type="button"
                    onClick={handleSend}
                    disabled={(replyText.trim() === "" && !selectedFile) || isRecording || isLoading}
                    className="flex-shrink-0 bg-gradient-to-r from-hotel-600 to-hotel-500 hover:from-hotel-700 hover:to-hotel-600 transition-all duration-200 shadow-sm"
                  >
                    <Send className="h-5 w-5 mr-1" /> Enviar
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-full text-gray-500"
            >
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Seleccione un huésped para ver los mensajes</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceptionDashboard;
