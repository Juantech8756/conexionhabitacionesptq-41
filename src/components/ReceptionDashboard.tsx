import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, MessageCircle, Mic, MicOff, Send, Bell, ArrowLeft, Menu, Phone, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import AudioMessagePlayer from "@/components/AudioMessagePlayer";
import MediaMessage from "@/components/MediaMessage";
import MediaUploader from "@/components/MediaUploader";
import { showGlobalAlert } from "@/hooks/use-alerts";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import AudioRecorder from "@/components/AudioRecorder";
import { useRealtime } from "@/hooks/use-realtime";
import MessageNotificationBadge from "@/components/MessageNotificationBadge";
import DeleteChatDialog from "@/components/DeleteChatDialog";

type Guest = {
  id: string;
  name: string;
  room_number: string;
  room_id: string | null;
  last_activity: string;
  unread_messages: number;
  wait_time_minutes: number | null;
  guest_count: number | null;
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
  onCallGuest?: (guest: {
    id: string;
    name: string;
    roomNumber: string;
  }) => void;
}
const ReceptionDashboard = ({
  onCallGuest
}: ReceptionDashboardProps) => {
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
  const [recentlyUpdatedGuests, setRecentlyUpdatedGuests] = useState<Record<string, boolean>>({});
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(Date.now());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<Guest | null>(null);
  const {
    toast
  } = useToast();
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
        const {
          data,
          error
        } = await supabase.from('rooms').select('*');
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
  }, []);

  // Set up real-time subscriptions for all data
  const { isConnected } = useRealtime([
    // Room changes
    {
      table: 'rooms',
      event: '*',
      callback: async (payload) => {
        console.log("Room changed:", payload);
        
        // Update the single room in our rooms state
        if (payload.new) {
          setRooms(prev => ({
            ...prev,
            [payload.new.id]: payload.new as Room
          }));
        }
      }
    },
    // Guest changes
    {
      table: 'guests',
      event: '*',
      callback: (payload) => {
        console.log("Guest changed:", payload);
        refreshGuestsList();
      }
    },
    // Message changes for all guests (we'll filter as needed)
    {
      table: 'messages',
      event: 'INSERT',
      callback: (payload) => {
        const newMessage = payload.new as Message;
        console.log("New message:", newMessage);
        
        // Add visual indicator for guest with new message
        setRecentlyUpdatedGuests(prev => ({
          ...prev,
          [newMessage.guest_id]: true
        }));
        
        // Clear the indicator after 3 seconds
        setTimeout(() => {
          setRecentlyUpdatedGuests(prev => ({
            ...prev,
            [newMessage.guest_id]: false
          }));
        }, 3000);
        
        // Update the messages for this guest if we're viewing them
        if (selectedGuest && selectedGuest.id === newMessage.guest_id) {
          setMessages(prev => ({
            ...prev,
            [selectedGuest.id]: [...(prev[selectedGuest.id] || []), newMessage]
          }));
          
          // Mark previous messages as responded if this is a staff reply
          if (!newMessage.is_guest) {
            updateResponseStatus(selectedGuest.id);
          } else {
            // If it's a guest message and we're viewing that guest, mark as read in UI
            setGuests(prevGuests => prevGuests.map(g => {
              if (g.id === selectedGuest.id) {
                return {
                  ...g,
                  unread_messages: g.unread_messages + 1,
                  last_activity: newMessage.created_at
                };
              }
              return g;
            }));
            
            // Force refresh response stats after a short delay
            setTimeout(() => {
              refreshGuestsList();
            }, 500);
          }
          
          // Scroll to bottom
          setTimeout(() => scrollToBottom(true), 100);
        } else {
          // If we're not viewing this guest, update their unread count
          setGuests(prevGuests => prevGuests.map(g => {
            if (g.id === newMessage.guest_id && newMessage.is_guest) {
              return {
                ...g,
                unread_messages: g.unread_messages + 1,
                last_activity: newMessage.created_at
              };
            }
            return g;
          }));
        }
        
        setLastUpdateTimestamp(Date.now());
      }
    }
  ], "reception-dashboard-realtime");

  // Force refresh guests list
  const refreshGuestsList = async () => {
    try {
      // Join guests and response_statistics to get wait times
      const {
        data: statsData,
        error: statsError
      } = await supabase.from('response_statistics').select('guest_id, guest_name, room_number, pending_messages, wait_time_minutes');
      
      if (statsError) throw statsError;

      // Get all guests
      const {
        data: guestsData,
        error: guestsError
      } = await supabase.from('guests').select('id, name, room_number, room_id, created_at');
      
      if (guestsError) throw guestsError;
      if (!guestsData) return;

      // Create a map of response statistics by guest_id
      const statsMap: Record<string, any> = {};
      statsData?.forEach(stat => {
        statsMap[stat.guest_id] = stat;
      });

      // For each guest, get the latest message timestamp and unread count
      const enhancedGuests = await Promise.all(guestsData.map(async guest => {
        // Get latest message timestamp
        const {
          data: latestMessage
        } = await supabase.from('messages').select('created_at').eq('guest_id', guest.id).order('created_at', {
          ascending: false
        }).limit(1).single();

        // Get stats from the stats map
        const guestStats = statsMap[guest.id] || {};
        
        return {
          ...guest,
          last_activity: latestMessage?.created_at || guest.created_at,
          unread_messages: guestStats.pending_messages || 0,
          wait_time_minutes: guestStats.wait_time_minutes || 0,
          guest_count: guestStats.guest_count || null
        };
      }));

      // Sort by last activity
      enhancedGuests.sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());
      
      setGuests(enhancedGuests);
    } catch (error) {
      console.error("Error refreshing guests list:", error);
    }
  };

  // Load guests with response stats - improved with manual refresh trigger
  useEffect(() => {
    refreshGuestsList();
  }, [toast]);

  // Load messages for selected guest
  useEffect(() => {
    if (!selectedGuest) return;
    const fetchMessages = async () => {
      try {
        const {
          data,
          error
        } = await supabase.from('messages').select('*').eq('guest_id', selectedGuest.id).order('created_at', {
          ascending: true
        });
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
          variant: "destructive"
        });
      }
    };
    fetchMessages();

    // Subscribe to new messages for this guest
    const channel = supabase.channel(`guest-${selectedGuest.id}-messages`).on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `guest_id=eq.${selectedGuest.id}`
    }, payload => {
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
      setGuests(prev => prev.map(g => {
        if (g.id === selectedGuest.id && (payload.new as any).is_guest) {
          return {
            ...g,
            unread_messages: g.unread_messages + 1
          };
        }
        return g;
      }));

      // Scroll to bottom when new message arrives
      setTimeout(() => scrollToBottom(true), 100);
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGuest, toast]);

  // Update response status for messages when staff replies
  const updateResponseStatus = async (guestId: string) => {
    const now = new Date().toISOString();
    try {
      // Find all unreplied guest messages in a single call
      const {
        data: pendingMessages,
        error: fetchError
      } = await supabase
        .from('messages')
        .select('id, created_at')
        .eq('guest_id', guestId)
        .eq('is_guest', true)
        .is('responded_at', null);
      
      if (fetchError) throw fetchError;
      if (!pendingMessages || pendingMessages.length === 0) return;

      // Prepare updates for batch processing
      const updatePromises = pendingMessages.map(msg => {
        // Calculate response time in seconds
        const createdAt = new Date(msg.created_at);
        const responseTime = Math.round((new Date().getTime() - createdAt.getTime()) / 1000);

        // Update each message individually (could be optimized with batch updates)
        return supabase.from('messages').update({
          responded_at: now,
          response_time: responseTime
        }).eq('id', msg.id);
      });
      
      // Execute all updates in parallel
      await Promise.all(updatePromises);

      // Immediately reset wait time in local state for better UX feedback
      if (selectedGuest && selectedGuest.id === guestId) {
        setSelectedGuest(prev => prev ? {
          ...prev,
          wait_time_minutes: 0,
          unread_messages: 0
        } : null);
      }

      // Also update the guest in the guests list
      setGuests(prevGuests => prevGuests.map(g => g.id === guestId ? {
        ...g,
        wait_time_minutes: 0,
        unread_messages: 0
      } : g));

      // Force refresh guest statistics after a short delay
      setTimeout(() => {
        refreshGuestsList();
      }, 500);
    } catch (error) {
      console.error("Error updating response status:", error);
    }
  };
  const selectGuest = (guest: Guest) => {
    setSelectedGuest(guest);
    // Mark messages as read (for UI purposes, no actual read status in DB)
    setGuests(prevGuests => prevGuests.map(g => g.id === guest.id ? {
      ...g,
      unread_messages: 0
    } : g));
    if (isMobile) {
      setShowGuestList(false);
    }
  };
  const handleBackToGuestList = () => {
    if (isMobile) {
      setSelectedGuest(null);
    }
  };

  // Handle delete guest action
  const handleDeleteGuestClick = (e: React.MouseEvent, guest: Guest) => {
    e.stopPropagation(); // Prevent selecting the guest when clicking delete
    setGuestToDelete(guest);
    setIsDeleteDialogOpen(true);
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
  const handleSend = async () => {
    if (!selectedGuest) return;
    if (selectedFile) {
      // If there's a file pending upload, upload it first
      await handleFileUpload();
    } else if (replyText.trim() !== "") {
      // Otherwise send a text message if there's text
      await sendReply();
    }
  };
  const handleFileSelect = (file: File | null) => {
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
      const {
        data,
        error
      } = await supabase.storage.from('chat_media').upload(filePath, selectedFile);
      if (error) throw error;

      // Get public URL for the uploaded file
      const {
        data: publicUrlData
      } = supabase.storage.from('chat_media').getPublicUrl(filePath);

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
      const {
        error: msgError
      } = await supabase.from('messages').insert([newMessage]);
      if (msgError) throw msgError;

      // Mark all pending messages as responded
      await updateResponseStatus(selectedGuest.id);

      // Reset wait time in the UI
      setSelectedGuest(prev => prev ? {
        ...prev,
        wait_time_minutes: 0
      } : null);
      setGuests(prevGuests => prevGuests.map(g => g.id === selectedGuest.id ? {
        ...g,
        wait_time_minutes: 0
      } : g));

      // Force refresh guest statistics
      setTimeout(() => {
        refreshGuestsList();
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
        variant: "destructive"
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
      const {
        error
      } = await supabase.from('messages').insert([newMessage]);
      if (error) throw error;
      setReplyText("");

      // 2. Mark all pending messages as responded
      await updateResponseStatus(selectedGuest.id);

      // 3. Immediately reset wait time in the local UI for better UX feedback
      setSelectedGuest(prev => prev ? {
        ...prev,
        wait_time_minutes: 0
      } : null);
      setGuests(prevGuests => prevGuests.map(g => g.id === selectedGuest.id ? {
        ...g,
        wait_time_minutes: 0
      } : g));

      // 4. Force refresh guest statistics to ensure wait time is properly reset
      setTimeout(() => {
        refreshGuestsList();
      }, 500);
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const startRecording = async () => {
    if (!selectedGuest) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => {
        chunks.push(e.data);
      };
      recorder.onstop = async () => {
        setIsLoading(true);
        try {
          const audioBlob = new Blob(chunks, {
            type: "audio/webm"
          });

          // Upload to Supabase Storage
          const fileName = `audio_${Date.now()}_reception.webm`;
          const {
            data: uploadData,
            error: uploadError
          } = await supabase.storage.from('audio_messages').upload(fileName, audioBlob);
          if (uploadError) throw uploadError;

          // Get public URL
          const {
            data: publicUrlData
          } = supabase.storage.from('audio_messages').getPublicUrl(fileName);

          // Add message with audio
          const newAudioMessage = {
            guest_id: selectedGuest.id,
            content: "Mensaje de voz",
            is_guest: false,
            is_audio: true,
            audio_url: publicUrlData.publicUrl
          };
          const {
            error: messageError
          } = await supabase.from('messages').insert([newAudioMessage]);
          if (messageError) throw messageError;

          // Mark all pending messages as responded
          await updateResponseStatus(selectedGuest.id);

          // Immediately reset wait time in UI
          setSelectedGuest(prev => prev ? {
            ...prev,
            wait_time_minutes: 0
          } : null);
          setGuests(prevGuests => prevGuests.map(g => g.id === selectedGuest.id ? {
            ...g,
            wait_time_minutes: 0
          } : g));

          // Force refresh statistics to ensure wait time is properly updated
          setTimeout(() => {
            refreshGuestsList();
          }, 500);
        } catch (error) {
          console.error("Error uploading audio:", error);
          toast({
            title: "Error",
            description: "No se pudo enviar el mensaje de voz",
            variant: "destructive"
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
        description: "Hable ahora. Pulse el botón de nuevo para detener la grabación."
      });
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast({
        title: "Error de acceso al micrófono",
        description: "No se pudo acceder al micrófono. Verifique los permisos del navegador.",
        variant: "destructive"
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
      const {
        error
      } = await supabase.from('messages').insert([newMessage]);
      if (error) throw error;

      // Mark all pending messages as responded
      await updateResponseStatus(selectedGuest.id);

      // Reset wait time in the UI for better UX feedback
      setSelectedGuest(prev => prev ? {
        ...prev,
        wait_time_minutes: 0
      } : null);
      setGuests(prevGuests => prevGuests.map(g => g.id === selectedGuest.id ? {
        ...g,
        wait_time_minutes: 0
      } : g));

      // Force refresh guest statistics
      setTimeout(() => {
        refreshGuestsList();
      }, 500);
    } catch (error) {
      console.error("Error sending media message:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje multimedia",
        variant: "destructive"
      });
    }
  };

  // Handle audio recording
  const handleAudioRecorded = async (audioBlob: Blob) => {
    if (!selectedGuest) return;
    setIsLoading(true);
    
    try {
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

      // Reset wait time in UI
      setSelectedGuest(prev => 
        prev ? { ...prev, wait_time_minutes: 0 } : null
      );
      
      setGuests(prevGuests => 
        prevGuests.map(g => 
          g.id === selectedGuest.id ? { ...g, wait_time_minutes: 0 } : g
        )
      );

      // Force refresh statistics
      setTimeout(() => {
        refreshGuestsList();
      }, 500);
      
    } catch (error) {
      console.error("Error uploading audio:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje de voz",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAudio = () => {
    // Simply reset any audio state
    console.log("Audio recording cancelled");
  };

  // Get room info if available
  const getRoomInfo = (guest: Guest) => {
    if (guest.room_id && rooms[guest.room_id]) {
      const room = rooms[guest.room_id];
      return <div className="flex flex-col mt-1">
          <div className="text-xs text-gray-500">
            {room.type && <span className="mr-2">{room.type === 'family' ? 'Cabaña familiar' : room.type === 'couple' ? 'Cabaña pareja' : room.type}</span>}
            {room.floor && <span className="mr-2">Piso {room.floor}</span>}
            {guest.guest_count && <span className="font-medium text-hotel-600">{guest.guest_count} {guest.guest_count === 1 ? 'Hospedado' : 'Hospedados'}</span>}
          </div>
        </div>;
    }
    return null;
  };

  // Delete chat and all associated messages and files
  const deleteChat = async () => {
    const guestToRemove = guestToDelete || selectedGuest;
    if (!guestToRemove) return;
    
    setIsDeleting(true);
    try {
      showGlobalAlert({
        title: "Eliminando conversación",
        description: `Eliminando todos los mensajes con ${guestToRemove.name}...`,
        duration: 3000
      });
      
      // Get all messages for this guest to identify media files to delete
      const { data: messagesToDelete, error: msgFetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('guest_id', guestToRemove.id);
        
      if (msgFetchError) throw msgFetchError;
      
      // Collect media files to delete
      const mediaFilesToDelete = [];
      const audioFilesToDelete = [];
      
      for (const msg of messagesToDelete || []) {
        // Collect audio files
        if (msg.is_audio && msg.audio_url) {
          const audioPath = msg.audio_url.split('/').pop();
          if (audioPath) audioFilesToDelete.push(audioPath);
        }
        
        // Collect media files (images, videos)
        if (msg.is_media && msg.media_url) {
          // Extract path from the full URL
          // Format is usually: /storage/v1/object/public/chat_media/media/{guestId}/{type}s/filename
          const urlParts = msg.media_url.split('/chat_media/');
          if (urlParts.length > 1) {
            mediaFilesToDelete.push(urlParts[1]);
          }
        }
      }
      
      // Step 1: Delete all messages for this guest
      const { error: deleteMessagesError } = await supabase
        .from('messages')
        .delete()
        .eq('guest_id', guestToRemove.id);
        
      if (deleteMessagesError) throw deleteMessagesError;
      
      // Step 2: Delete media files from storage if any exist
      if (mediaFilesToDelete.length > 0) {
        try {
          const { error: mediaDeleteError } = await supabase
            .storage
            .from('chat_media')
            .remove(mediaFilesToDelete);
            
          if (mediaDeleteError) {
            console.error("Error deleting media files:", mediaDeleteError);
            // Continue with deletion process even if some media files failed to delete
          }
        } catch (mediaError) {
          console.error("Error handling media file deletion:", mediaError);
          // Continue with process despite errors with media deletion
        }
      }
      
      // Step 3: Delete audio files from storage if any exist
      if (audioFilesToDelete.length > 0) {
        try {
          const { error: audioDeleteError } = await supabase
            .storage
            .from('audio_messages')
            .remove(audioFilesToDelete);
            
          if (audioDeleteError) {
            console.error("Error deleting audio files:", audioDeleteError);
            // Continue with deletion process even if some audio files failed to delete
          }
        } catch (audioError) {
          console.error("Error handling audio file deletion:", audioError);
          // Continue with process despite errors with audio deletion
        }
      }
      
      // Step 4: Delete the guest from the guests table
      const { error: guestDeleteError } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestToRemove.id);
        
      if (guestDeleteError) {
        console.error("Error deleting guest:", guestDeleteError);
        toast({
          title: "Advertencia",
          description: "Se eliminaron todos los mensajes pero hubo un problema al eliminar al huésped. Parte de la información podría permanecer en el sistema.",
          variant: "destructive",
          duration: 5000
        });
      }
      
      // Clear messages from local state
      setMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[guestToRemove.id];
        return newMessages;
      });
      
      // If the deleted guest is the currently selected guest, deselect it
      if (selectedGuest && selectedGuest.id === guestToRemove.id) {
        setSelectedGuest(null);
      }
      
      // Remove the guest from the guests list
      setGuests(prevGuests => prevGuests.filter(g => g.id !== guestToRemove.id));
      
      // Close the delete dialog
      setIsDeleteDialogOpen(false);
      setGuestToDelete(null);
      
      // Force refresh guests list
      refreshGuestsList();
      
      toast({
        title: "Conversación eliminada",
        description: "Todos los mensajes, archivos y datos del huésped han sido eliminados correctamente.",
        duration: 4000
      });
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar completamente la conversación. Por favor, inténtalo de nuevo.",
        variant: "destructive",
        duration: 4000
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // For desktop layout, modify the header to include delete button
  const renderDesktopHeader = () => {
    return (
      <header className="p-4 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{selectedGuest?.name}</h2>
            <p className="text-sm text-gray-500 flex flex-wrap items-center gap-2">
              <span>Cabaña {selectedGuest?.room_number}</span>
              
              {selectedGuest?.guest_count && 
                <span className="bg-blue-50 text-hotel-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  {selectedGuest.guest_count} {selectedGuest.guest_count === 1 ? 'Hospedado' : 'Hospedados'}
                </span>
              }
              
              {selectedGuest?.wait_time_minutes && selectedGuest.wait_time_minutes > 0 ? (
                <span className="text-amber-600">
                  Esperando respuesta: {selectedGuest.wait_time_minutes} min
                </span>
              ) : null}
            </p>
            {getRoomInfo(selectedGuest)}
          </div>
          
          <div className="flex items-center gap-2">
            <ConnectionStatusIndicator />
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar chat
            </Button>
            
            <Button size="sm" onClick={handleCallGuest} className="bg-green-500 hover:bg-green-600">
              <Phone className="h-4 w-4 mr-2" />
              Llamar
            </Button>
          </div>
        </div>
      </header>
    );
  };

  // For mobile layout, add delete button to header
  const renderMobileHeader = () => {
    return (
      <header className="bg-gradient-to-r from-hotel-600 to-hotel-500 p-3 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="mr-2 text-white hover:bg-white/20" onClick={handleBackToGuestList}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-grow">
            <h2 className="text-base font-semibold">{selectedGuest?.name}</h2>
            <p className="text-xs text-white/90 flex items-center">
              <span>Cabaña {selectedGuest?.room_number}</span>
              {selectedGuest?.guest_count && 
                <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
                  {selectedGuest.guest_count} {selectedGuest.guest_count === 1 ? 'Hospedado' : 'Hospedados'}
                </span>
              }
            </p>
          </div>
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-white hover:bg-white/20 mr-1" 
              title="Eliminar chat"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCallGuest} className="text-white hover:bg-white/20" title="Llamar a huésped">
              <Phone className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
    );
  };

  // Mobile layout with sliding panels
  if (isMobile) {
    return <div className="flex h-full bg-gray-100 relative">
        <AnimatePresence initial={false}>
          {!selectedGuest ? <motion.div key="guest-list" initial={{
          opacity: 0,
          x: -10
        }} animate={{
          opacity: 1,
          x: 0
        }} exit={{
          opacity: 0,
          x: -10
        }} transition={{
          duration: 0.2
        }} className="w-full h-full bg-white">
              <div className="p-4 gradient-header flex items-center">
                <h2 className="text-lg font-semibold flex items-center text-white">
                  <User className="mr-2 h-5 w-5" />
                  Huéspedes
                </h2>
              </div>
              
              <ScrollArea className="h-[calc(100%-64px)]">
                <AnimatePresence>
                  {guests.length === 0 ? <motion.div initial={{
                opacity: 0
              }} animate={{
                opacity: 1
              }} className="p-4 text-gray-500 text-center">
                      No hay huéspedes registrados
                    </motion.div> : guests.map(guest => <motion.div key={guest.id} initial={{
                opacity: 0,
                y: 10
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                duration: 0.2
              }} className="p-4 border-b hover:bg-gray-50 transition-colors duration-200 relative">
                      <div 
                        className="flex justify-between items-start cursor-pointer" 
                        onClick={() => selectGuest(guest)}
                      >
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
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-100"
                            onClick={(e) => handleDeleteGuestClick(e, guest)}
                            title="Eliminar conversación"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                          
                          {guest.unread_messages > 0 && (
                            <motion.div 
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              className="bg-hotel-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs shadow-md ml-1"
                            >
                              {guest.unread_messages}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>)}
                </AnimatePresence>
              </ScrollArea>
            </motion.div> : <motion.div key="chat-view" initial={{
          opacity: 0,
          x: 10
        }} animate={{
          opacity: 1,
          x: 0
        }} exit={{
          opacity: 0,
          x: 10
        }} transition={{
          duration: 0.2
        }} className="flex flex-col w-full h-full bg-gray-50">
              {renderMobileHeader()}

              <div className="flex-grow overflow-auto p-2" ref={scrollContainerRef}>
                <div className="space-y-3">
                  <AnimatePresence>
                    {messages[selectedGuest.id]?.map(msg => <motion.div key={msg.id} initial={{
                  opacity: 0,
                  y: 10
                }} animate={{
                  opacity: 1,
                  y: 0
                }} transition={{
                  duration: 0.2
                }} className={`flex ${msg.is_guest ? 'justify-start' : 'justify-end'}`}>
                        <div className={`rounded-lg ${msg.is_guest ? 'chat-bubble-guest' : 'chat-bubble-staff'} mx-2 my-1 px-3 py-2`}>
                          {msg.is_audio ? <AudioMessagePlayer audioUrl={msg.audio_url || ''} isGuest={!msg.is_guest} isDark={!msg.is_guest} /> : msg.is_media ? <MediaMessage mediaUrl={msg.media_url || ''} mediaType={msg.media_type || 'image'} isGuest={msg.is_guest} /> : <p className="text-sm break-words">{msg.content}</p>}
                        </div>
                      </motion.div>)}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="p-3 border-t bg-white shadow-inner">
                <div className="flex items-center space-x-2">
                  <Button type="button" size="icon" variant="outline" onClick={toggleRecording} className={`flex-shrink-0 ${isRecording ? 'bg-red-100 text-red-600 border-red-300 animate-pulse' : ''}`} disabled={isLoading}>
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  
                  <MediaUploader guestId={selectedGuest.id} onUploadComplete={handleMediaUploadComplete} disabled={isRecording || isLoading} onFileSelect={handleFileSelect} selectedFile={selectedFile} />
                  
                  <Input placeholder="Escriba su respuesta..." value={replyText} onChange={e => setReplyText(e.target.value)} onKeyPress={e => e.key === "Enter" && handleSend()} className="flex-grow shadow-sm text-sm" disabled={isRecording || isLoading} />
                  
                  <Button type="button" onClick={handleSend} disabled={replyText.trim() === "" && !selectedFile || isRecording || isLoading} className="flex-shrink-0 bg-gradient-to-r from-hotel-600 to-hotel-500 hover:from-hotel-700 hover:to-hotel-600">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>}
        </AnimatePresence>
        
        {/* Delete chat dialog - works for both selected guest and list deletion */}
        <DeleteChatDialog
          isOpen={isDeleteDialogOpen}
          guestName={(guestToDelete || selectedGuest)?.name || ""}
          roomNumber={(guestToDelete || selectedGuest)?.room_number || ""}
          onConfirm={deleteChat}
          onCancel={() => {
            setIsDeleteDialogOpen(false);
            setGuestToDelete(null);
          }}
          isDeleting={isDeleting}
        />
      </div>;
  }

  // Desktop layout with side-by-side panels
  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r bg-white shadow-sm">
        <div className="p-4 bg-gradient-to-r from-hotel-600 to-hotel-500 text-white flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center">
            <User className="mr-2 h-5 w-5" />
            Huéspedes
          </h2>
          <ConnectionStatusIndicator className="bg-white/10 text-white" />
        </div>
        <ScrollArea className="h-[calc(100%-65px)]">
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
              guests.map(guest => (
                <motion.div 
                  key={guest.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    backgroundColor: recentlyUpdatedGuests[guest.id] ? 'rgba(219, 234, 254, 0.8)' : 'transparent'
                  }}
                  transition={{
                    duration: 0.2,
                    backgroundColor: { duration: 1 }
                  }}
                  className={`p-4 border-b hover:bg-gray-50 transition-colors duration-200 ${
                    selectedGuest?.id === guest.id 
                      ? "bg-blue-50 border-l-4 border-l-hotel-600" 
                      : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div 
                      className="cursor-pointer flex-grow" 
                      onClick={() => selectGuest(guest)}
                    >
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
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-100"
                        onClick={(e) => handleDeleteGuestClick(e, guest)}
                        title="Eliminar conversación"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                      
                      <MessageNotificationBadge 
                        count={guest.unread_messages}
                        waitTime={guest.wait_time_minutes} 
                      />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </ScrollArea>
      </div>
      
      <div className="flex-1 flex flex-col">
        {selectedGuest ? (
          <>
            {renderDesktopHeader()}
            
            <ScrollArea className="flex-grow p-4" ref={scrollContainerRef}>
              <div className="space-y-4 max-w-3xl mx-auto">
                <AnimatePresence initial={false}>
                  {messages[selectedGuest.id]?.map(msg => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.2
                      }}
                      className={`flex ${msg.is_guest ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[85%] p-3 rounded-lg ${
                        msg.is_guest 
                          ? 'bg-white border border-gray-200 text-gray-800' 
                          : 'bg-gradient-to-r from-hotel-600 to-hotel-500 text-white'
                      }`}>
                        {msg.is_audio ? (
                          <AudioMessagePlayer 
                            audioUrl={msg.audio_url || ''} 
                            isGuest={!msg.is_guest}
                            isDark={!msg.is_guest}
                          />
                        ) : msg.is_media ? (
                          <MediaMessage 
                            mediaUrl={msg.media_url || ''} 
                            mediaType={msg.media_type || 'image'} 
                            isGuest={msg.is_guest} 
                          />
                        ) : (
                          <p className="text-sm break-words">{msg.content}</p>
                        )}
                        
                        <div className="mt-1 text-xs opacity-70 text-right">
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t bg-white">
              <div className="flex items-center space-x-2 max-w-3xl mx-auto">
                <AudioRecorder
                  onAudioRecorded={handleAudioRecorded}
                  onCancel={handleCancelAudio}
                  disabled={isLoading || !!selectedFile}
                  title="Grabar mensaje de voz"
                />
                
                <MediaUploader
                  guestId={selectedGuest.id}
                  onUploadComplete={handleMediaUploadComplete}
                  disabled={isLoading}
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                />
                
                <Input
                  placeholder="Escriba su respuesta..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyPress={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="flex-grow"
                  disabled={isLoading || !!selectedFile}
                />
                
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={(replyText.trim() === "" && !selectedFile) || isLoading}
                  className="flex-shrink-0 bg-gradient-to-r from-hotel-600 to-hotel-500 hover:from-hotel-700 hover:to-hotel-600"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6 max-w-md">
              <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Seleccione un huésped</h3>
              <p className="text-gray-500">
                Seleccione un huésped de la lista para ver y responder a sus mensajes.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Delete chat dialog - works for both selected guest and list deletion */}
      <DeleteChatDialog
        isOpen={isDeleteDialogOpen}
        guestName={(guestToDelete || selectedGuest)?.name || ""}
        roomNumber={(guestToDelete || selectedGuest)?.room_number || ""}
        onConfirm={deleteChat}
        onCancel={() => {
          setIsDeleteDialogOpen(false);
          setGuestToDelete(null);
        }}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default ReceptionDashboard;
