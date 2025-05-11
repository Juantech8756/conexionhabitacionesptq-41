import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { QrCode, RefreshCcw, AlertTriangle, ImagePlus, Loader2, Send, Mic, MicOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAlert } from "@/hooks/use-alert";
import { supabase } from "@/integrations/supabase/client";
import AudioMessagePlayer from "@/components/AudioMessagePlayer";
import MediaMessage from "@/components/MediaMessage";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface GuestChatProps {
  isSimulationMode?: boolean;
  preselectedRoomId?: string | null;
}

interface Room {
  id: string;
  room_number: string;
  status: string;
}

interface Guest {
  id: string;
  room_id: string | null;
  name: string;
}

interface Message {
  id: string;
  guest_id: string;
  content: string;
  is_guest: boolean;
  created_at: string;
  is_audio: boolean;
  audio_url?: string;
  is_media?: boolean;
  media_url?: string;
  media_type?: 'image' | 'video';
}

const GuestChat = ({ isSimulationMode = false, preselectedRoomId = null }: GuestChatProps) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [guestName, setGuestName] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchParams] = useSearchParams();
  const roomIdFromParams = searchParams.get("room");
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    showAlert
  } = useAlert();
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end"
      });
    }
  };
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'HH:mm', { locale: es });
  };
  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room);
  };
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGuestName(e.target.value);
  };
  const checkGuestRegistration = async (roomId: string) => {
    setIsLoading(true);
    try {
      // Check if a guest is already registered for this room
      const {
        data: existingGuest,
        error: guestError
      } = await supabase.from('guests').select('*').eq('room_id', roomId).single();
      if (guestError && guestError.code !== 'PGRST116') throw guestError;
      if (existingGuest) {
        setGuest(existingGuest);
        setGuestName(existingGuest.name);
        setIsRegistered(true);
        loadMessages(existingGuest.id);
        toast({
          title: "Bienvenido de nuevo",
          description: `Hola ${existingGuest.name}, bienvenido de nuevo a la conversación.`
        });
      } else {
        setIsRegistered(false);
      }
    } catch (error) {
      console.error("Error checking guest registration:", error);
      toast({
        title: "Error",
        description: "No se pudo verificar el registro. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const registerGuest = async () => {
    if (!selectedRoom || guestName.trim() === "") {
      toast({
        title: "Error",
        description: "Por favor, seleccione una cabaña e ingrese su nombre.",
        variant: "destructive"
      });
      return;
    }
    setIsRegistering(true);
    try {
      // Insert new guest into Supabase
      const {
        data: newGuest,
        error: registerError
      } = await supabase.from('guests').insert([{
        room_id: selectedRoom.id,
        name: guestName
      }]).select().single();
      if (registerError) throw registerError;
      setGuest(newGuest);
      setIsRegistered(true);
      toast({
        title: "Registro exitoso",
        description: `Bienvenido, ${guestName}! Ahora puedes enviar mensajes.`,
        duration: 5000
      });
    } catch (error) {
      console.error("Error registering guest:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsRegistering(false);
    }
  };
  const loadMessages = async (guestId: string) => {
    setIsLoading(true);
    try {
      // Load messages from Supabase
      const {
        data,
        error
      } = await supabase.from('messages').select('*').eq('guest_id', guestId).order('created_at', {
        ascending: true
      });
      if (error) throw error;
      setMessages(data || []);
      setTimeout(() => scrollToBottom(false), 100);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los mensajes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    const fetchRoomsAndGuests = async () => {
      try {
        // Fetch rooms from Supabase
        const {
          data: roomsData,
          error: roomsError
        } = await supabase.from('rooms').select('id, room_number, status').eq('status', 'occupied').order('room_number', {
          ascending: true
        });
        if (roomsError) throw roomsError;
        setRooms(roomsData || []);

        // Si estamos en modo simulación y tenemos un ID preseleccionado
        if (isSimulationMode && preselectedRoomId) {
          const selectedRoom = roomsData?.find(room => room.id === preselectedRoomId);
          if (selectedRoom) {
            setSelectedRoom(selectedRoom);
            // También iniciar el proceso de registro automáticamente
            checkGuestRegistration(selectedRoom.id);
          }
        }
        // If roomId is in the URL, select the room and check registration
        else if (roomIdFromParams && !selectedRoom) {
            const selectedRoom = roomsData?.find(room => room.id === roomIdFromParams);
            if (selectedRoom) {
              setSelectedRoom(selectedRoom);
              checkGuestRegistration(selectedRoom.id);
            } else {
              toast({
                title: "Error",
                description: "La cabaña especificada en la URL no se encontró o no está disponible.",
                variant: "destructive"
              });
            }
          }
      } catch (error) {
        console.error("Error fetching rooms:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las cabañas. Inténtalo de nuevo.",
          variant: "destructive"
        });
      } finally {
        setIsInitialLoad(false);
      }
    };
    fetchRoomsAndGuests();
  }, [toast, roomIdFromParams, preselectedRoomId, isSimulationMode]);
  useEffect(() => {
    if (!selectedRoom) return;
    checkGuestRegistration(selectedRoom.id);
  }, [selectedRoom]);
  useEffect(() => {
    if (!guest) return;
    loadMessages(guest.id);
  }, [guest]);
  useEffect(() => {
    if (!guest) return;
    const channel = supabase.channel(`messages-guest-${guest.id}`).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'messages',
      filter: `guest_id=eq.${guest.id}`
    }, payload => {
      if (payload.new) {
        setMessages(prevMessages => [...prevMessages, payload.new]);
        setTimeout(() => scrollToBottom(true), 100);
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [guest]);
  const handleSendMessage = async () => {
    if (messageText.trim() === "" || !guest || isLoading) return;
    setIsLoading(true);
    try {
      // Send message to Supabase
      const {
        error
      } = await supabase.from('messages').insert([{
        guest_id: guest.id,
        content: messageText,
        is_guest: true
      }]);
      if (error) throw error;
      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
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
          const fileName = `audio_${Date.now()}_guest.webm`;
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
            guest_id: guest.id,
            content: "Mensaje de voz",
            is_guest: true,
            is_audio: true,
            audio_url: publicUrlData.publicUrl
          };
          const {
            error: messageError
          } = await supabase.from('messages').insert([newAudioMessage]);
          if (messageError) throw messageError;
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
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };
  const handleUpload = async () => {
    if (!selectedFile || !guest) {
      toast({
        title: "Error",
        description: "Por favor, seleccione un archivo.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    setUploadProgress(0);
    try {
      // Determine file type
      const fileType = selectedFile.type.startsWith('image/') ? 'image' : 'video';

      // Create folder structure: media/{guestId}/{fileType}s/
      const fileName = `${Date.now()}_${selectedFile.name.replace(/\s+/g, '_')}`;
      const filePath = `media/${guest.id}/${fileType}s/${fileName}`;

      // Upload to Supabase Storage
      const {
        data,
        error
      } = await supabase.storage.from('chat_media').upload(filePath, selectedFile, {
        cacheControl: '3600',
        upsert: false,
        onUploadProgress: event => {
          const progress = event.loaded / event.total * 100;
          setUploadProgress(Math.round(progress));
        }
      });
      if (error) throw error;

      // Get public URL for the uploaded file
      const {
        data: publicUrlData
      } = supabase.storage.from('chat_media').getPublicUrl(filePath);

      // Create a new media message
      const newMessage = {
        guest_id: guest.id,
        content: fileType === 'image' ? "Imagen compartida" : "Video compartido",
        is_guest: true,
        is_audio: false,
        is_media: true,
        media_url: publicUrlData.publicUrl,
        media_type: fileType
      };
      const {
        error: msgError
      } = await supabase.from('messages').insert([newMessage]);
      if (msgError) throw msgError;
      toast({
        title: "Archivo enviado",
        description: "El archivo se ha enviado correctamente."
      });
      setSelectedFile(null);
      setUploadProgress(0);
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
  const handleCancelUpload = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };
  return (
    <div className={`flex flex-col h-full ${isSimulationMode ? 'bg-gray-50' : 'bg-gradient-to-b from-hotel-50 to-white'}`}>
      {!isSimulationMode && (
        <header className="bg-gradient-to-r from-hotel-700 to-hotel-500 p-4">
          <div className="max-w-xl mx-auto">
            <div className="flex items-center text-white">
              <Hotel className="h-7 w-7 mr-2" />
              <div>
                <h1 className="font-bold text-xl">Parque Temático Quimbaya</h1>
                <p className="text-sm">Chat de Huéspedes</p>
              </div>
            </div>
            {/* Este es un buen lugar para mostrar más información del resort o instrucciones breves */}
          </div>
        </header>
      )}

      {isInitialLoad ? (
        <div className="flex-grow flex items-center justify-center">
          <motion.div initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-hotel-600 animate-spin mb-2" />
            <p className="text-gray-600">Cargando...</p>
          </motion.div>
        </div>
      ) : !isRegistered ? (
        <div className="flex-grow flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Registro</h2>
              {!selectedRoom ? (
                <>
                  <p className="text-gray-600 mb-3">Seleccione su cabaña para continuar:</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {rooms.map(room => (
                      <Button key={room.id} variant="outline" onClick={() => handleRoomSelect(room)} className="justify-start">
                        <QrCode className="h-4 w-4 mr-2" />
                        Cabaña {room.room_number}
                      </Button>
                    ))}
                  </div>
                  {rooms.length === 0 && <div className="text-center text-gray-500">
                      <AlertTriangle className="inline-block h-5 w-5 mr-1 align-middle" />
                      No hay cabañas disponibles en este momento.
                    </div>}
                  <Button variant="secondary" onClick={() => navigate(0)} className="w-full">
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Recargar
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-gray-600 mb-3">Ingrese su nombre para registrarse en la cabaña <span className="font-medium">#{selectedRoom.room_number}</span>:</p>
                  <Input type="text" placeholder="Su nombre" value={guestName} onChange={handleNameChange} className="mb-4" />
                  <Button onClick={registerGuest} disabled={isRegistering} className="w-full">
                    {isRegistering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Registrarse
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex-grow overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                <AnimatePresence>
                  {messages.map(msg => (
                    <motion.div key={msg.id} initial={{
                      opacity: 0,
                      y: 10
                    }} animate={{
                      opacity: 1,
                      y: 0
                    }} exit={{
                      opacity: 0,
                      y: 10
                    }} transition={{
                      duration: 0.2
                    }} className={`flex ${msg.is_guest ? 'justify-start' : 'justify-end'}`}>
                      <div className={`rounded-lg ${msg.is_guest ? 'bg-gray-100 text-gray-800' : 'bg-hotel-600 text-white'} mx-2 my-1 px-3 py-2 max-w-[80%]`}>
                        {msg.is_audio ? <AudioMessagePlayer audioUrl={msg.audio_url || ''} isGuest={msg.is_guest} isDark={!msg.is_guest} /> : msg.is_media ? <MediaMessage mediaUrl={msg.media_url || ''} mediaType={msg.media_type || 'image'} isGuest={msg.is_guest} /> : <p className="text-sm break-words">{msg.content}</p>}
                        <div className="text-xs mt-1 text-right opacity-70">
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>
          <div className="p-4 bg-gray-50 border-t">
            <div className="flex items-center space-x-2">
              <Button type="button" size="icon" variant="outline" onClick={toggleRecording} className={`flex-shrink-0 ${isRecording ? 'bg-red-100 text-red-600 border-red-300 animate-pulse' : ''}`} disabled={isLoading}>
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <label htmlFor="media-upload">
                <Button type="button" size="icon" variant="outline" disabled={isLoading}>
                  <ImagePlus className="h-4 w-4" />
                </Button>
              </label>
              <input type="file" id="media-upload" accept="image/*, video/*" className="hidden" onChange={handleFileSelect} />
              {selectedFile ? <div className="flex items-center">
                  <p className="text-sm text-gray-600 mr-2">{selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</p>
                  {uploadProgress > 0 && uploadProgress < 100 ? <p className="text-sm text-gray-500">Subiendo... {uploadProgress}%</p> : <div className="flex space-x-2">
                      <Button type="button" size="sm" onClick={handleUpload} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        Enviar
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={handleCancelUpload} disabled={isLoading}>
                        Cancelar
                      </Button>
                    </div>}
                </div> : <Textarea placeholder="Escribe tu mensaje..." value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }} className="flex-grow resize-none shadow-sm" rows={1} disabled={isLoading || isRecording} />}
              <Button type="button" onClick={handleSendMessage} disabled={messageText.trim() === "" || isLoading || isRecording} className="bg-gradient-to-r from-hotel-600 to-hotel-500 hover:from-hotel-700 hover:to-hotel-600 text-white">
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </Button>
            </div>
          </div>
        </div>
      )}

      {isSimulationMode && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 m-4 rounded shadow-sm">
          <p className="text-blue-700 text-sm">
            <strong>Modo Simulación:</strong> Esta es una vista de simulación del portal del huésped para pruebas administrativas. Los mensajes enviados desde aquí aparecerán como mensajes reales del huésped en el panel de recepción.
          </p>
        </div>
      )}
    </div>
  );
};

export default GuestChat;
