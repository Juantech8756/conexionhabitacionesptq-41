
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, MessageCircle, Mic, MicOff, Send, Bell, Clock, CircleCheck, CircleX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

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
};

const ReceptionDashboard = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const { toast } = useToast();
  
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
              wait_time_minutes: guestStats.wait_time_minutes || null
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
        fetchGuests
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(guestsChannel);
      supabase.removeChannel(messagesChannel);
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
        
        setMessages(prev => ({
          ...prev,
          [selectedGuest.id]: data
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

  const sendReply = async () => {
    if (replyText.trim() === "" || !selectedGuest || isLoading) return;
    
    setIsLoading(true);
    
    try {
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

  // Get status indicator based on wait time
  const getWaitTimeIndicator = (waitMinutes: number | null) => {
    if (waitMinutes === null) return null;
    
    if (waitMinutes > 15) {
      return (
        <Badge variant="destructive" className="ml-2 shrink-0 animate-pulse">
          <Clock className="h-3 w-3 mr-1" />{Math.round(waitMinutes)} min
        </Badge>
      );
    } else if (waitMinutes > 5) {
      return (
        <Badge variant="default" className="bg-amber-500 ml-2 shrink-0">
          <Clock className="h-3 w-3 mr-1" />{Math.round(waitMinutes)} min
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-full h-full flex overflow-hidden">
        {/* Lista de huéspedes */}
        <div className="w-1/4 border-r bg-white overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-gradient-to-r from-hotel-600 to-hotel-500 text-white">
            <h2 className="text-xl font-semibold flex items-center">
              <User className="mr-2 h-5 w-5" />
              Huéspedes
            </h2>
          </div>
          
          <ScrollArea className="flex-grow">
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
                          {getWaitTimeIndicator(guest.wait_time_minutes)}
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

        {/* Panel de mensajes */}
        <div className="flex-grow flex flex-col bg-gray-50">
          {selectedGuest ? (
            <>
              <header className="bg-gradient-to-r from-hotel-600 to-hotel-500 p-4 text-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedGuest.name}</h2>
                    <p className="text-sm text-white/90 flex items-center">
                      Cabaña {selectedGuest.room_number}
                      {selectedGuest.wait_time_minutes && selectedGuest.wait_time_minutes > 0 && (
                        <span className="ml-3 flex items-center text-white/90">
                          <Clock className="h-3 w-3 mr-1" />
                          Esperando desde hace {Math.round(selectedGuest.wait_time_minutes)} min
                        </span>
                      )}
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
                    <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-none">
                      <Bell className="h-4 w-4 mr-1" /> Notificar
                    </Button>
                  </div>
                </div>
              </header>

              <div className="flex-grow overflow-auto" ref={scrollContainerRef}>
                <ScrollArea className="h-full p-4">
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
                            className={`max-w-[80%] p-3 rounded-lg shadow-sm ${
                              msg.is_guest 
                                ? 'bg-white border border-gray-200 text-gray-800' 
                                : 'bg-gradient-to-r from-hotel-600 to-hotel-500 text-white'
                            }`}
                          >
                            {msg.is_audio ? (
                              <div className="flex flex-col">
                                <div className="flex items-center space-x-2">
                                  <Mic className="h-5 w-5" />
                                  <span>{msg.is_guest ? "Audio recibido" : "Audio enviado"}</span>
                                </div>
                                <audio controls src={msg.audio_url} className="w-full mt-2">
                                  Su navegador no soporta el elemento de audio.
                                </audio>
                              </div>
                            ) : (
                              <p>{msg.content}</p>
                            )}
                            <div className="flex items-center justify-end gap-2 mt-1">
                              <p className="text-xs opacity-70">
                                {formatTime(msg.created_at)}
                              </p>
                              {msg.is_guest && msg.responded_at && (
                                <div className="text-xs flex items-center">
                                  <CircleCheck className="h-3 w-3 mr-1" />
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
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
                  
                  <Input
                    placeholder="Escriba su respuesta..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendReply()}
                    className="flex-grow shadow-sm focus:ring-2 focus:ring-hotel-500/50 transition-all duration-200"
                    disabled={isRecording || isLoading}
                  />
                  
                  <Button
                    type="button"
                    onClick={sendReply}
                    disabled={replyText.trim() === "" || isRecording || isLoading}
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
