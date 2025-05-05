
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, MessageCircle, Mic, MicOff, Send, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

type Guest = {
  id: string;
  name: string;
  room_number: string;
  last_activity: string;
  unread_messages: number;
};

type Message = {
  id: string;
  guest_id: string;
  content: string;
  is_guest: boolean;
  is_audio: boolean;
  audio_url?: string;
  created_at: string;
};

const ReceptionDashboard = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const { toast } = useToast();

  // Load guests
  useEffect(() => {
    const fetchGuests = async () => {
      try {
        // Get all guests
        const { data: guestsData, error: guestsError } = await supabase
          .from('guests')
          .select('id, name, room_number, created_at');
        
        if (guestsError) throw guestsError;

        if (!guestsData) return;
        
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
            
            // Count unread messages (assuming messages from guests are unread)
            const { count: unreadCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('guest_id', guest.id)
              .eq('is_guest', true)
              .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Messages in last 24h
            
            return {
              ...guest,
              last_activity: latestMessage?.created_at || guest.created_at,
              unread_messages: unreadCount || 0
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
        { event: 'INSERT', schema: 'public', table: 'guests' },
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
          setMessages(prev => ({
            ...prev,
            [selectedGuest.id]: [...(prev[selectedGuest.id] || []), payload.new as Message]
          }));
          
          // Update unread count for guests
          setGuests(prev => 
            prev.map(g => {
              if (g.id === selectedGuest.id && (payload.new as any).is_guest) {
                return { ...g, unread_messages: g.unread_messages + 1 };
              }
              return g;
            })
          );
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGuest, toast]);

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

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-full h-full flex overflow-hidden">
        {/* Lista de huéspedes */}
        <div className="w-1/4 border-r bg-white overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold flex items-center">
              <User className="mr-2 h-5 w-5" />
              Huéspedes
            </h2>
          </div>
          
          <ScrollArea className="flex-grow">
            {guests.length === 0 ? (
              <div className="p-4 text-gray-500 text-center">
                No hay huéspedes registrados
              </div>
            ) : (
              guests.map((guest) => (
                <div
                  key={guest.id}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedGuest?.id === guest.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => selectGuest(guest)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {guest.name} 
                        <span className="ml-2 text-sm text-gray-500">
                          Hab. {guest.room_number}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatLastActivity(guest.last_activity)}
                      </p>
                    </div>
                    {guest.unread_messages > 0 && (
                      <div className="bg-hotel-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs">
                        {guest.unread_messages}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Panel de mensajes */}
        <div className="flex-grow flex flex-col bg-gray-50">
          {selectedGuest ? (
            <>
              <header className="bg-white p-4 border-b shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedGuest.name}</h2>
                    <p className="text-sm text-gray-500">Habitación {selectedGuest.room_number}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Bell className="h-4 w-4 mr-1" /> Notificar
                    </Button>
                  </div>
                </div>
              </header>

              <ScrollArea className="flex-grow p-4">
                <div className="space-y-4">
                  {messages[selectedGuest.id]?.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_guest ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 ${
                          !msg.is_guest ? 'chat-bubble-guest' : 'chat-bubble-staff'
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
                        <p className="text-xs mt-1 opacity-70 text-right">
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-4 border-t bg-white">
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={toggleRecording}
                    className={`flex-shrink-0 ${isRecording ? 'bg-red-100 text-red-600 border-red-300' : ''}`}
                    disabled={isLoading}
                  >
                    {isRecording ? (
                      <MicOff className="h-5 w-5 recording-animation" />
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </Button>
                  
                  <Input
                    placeholder="Escriba su respuesta..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendReply()}
                    className="flex-grow"
                    disabled={isRecording || isLoading}
                  />
                  
                  <Button
                    type="button"
                    onClick={sendReply}
                    disabled={replyText.trim() === "" || isRecording || isLoading}
                    className="flex-shrink-0 bg-hotel-600 hover:bg-hotel-700"
                  >
                    <Send className="h-5 w-5 mr-1" /> Enviar
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Seleccione un huésped para ver los mensajes</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceptionDashboard;
