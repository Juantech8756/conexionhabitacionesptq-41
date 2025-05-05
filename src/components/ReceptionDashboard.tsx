
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, MessageCircle, Mic, MicOff, Send, Bell } from "lucide-react";

type Guest = {
  id: string;
  name: string;
  room: string;
  lastActivity: Date;
  unreadMessages: number;
};

type Message = {
  id: string;
  guestId: string;
  text: string;
  isGuest: boolean;
  isAudio?: boolean;
  audioUrl?: string;
  timestamp: Date;
};

const MOCK_GUESTS: Guest[] = [
  {
    id: "guest1",
    name: "Juan Pérez",
    room: "101",
    lastActivity: new Date(),
    unreadMessages: 2,
  },
  {
    id: "guest2",
    name: "María González",
    room: "204",
    lastActivity: new Date(Date.now() - 15 * 60000),
    unreadMessages: 0,
  },
  {
    id: "guest3",
    name: "Carlos Rodríguez",
    room: "305",
    lastActivity: new Date(Date.now() - 45 * 60000),
    unreadMessages: 1,
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  guest1: [
    {
      id: "msg1",
      guestId: "guest1",
      text: "Buenos días, ¿podría solicitar toallas adicionales?",
      isGuest: true,
      timestamp: new Date(Date.now() - 10 * 60000),
    },
    {
      id: "msg2",
      guestId: "guest1",
      text: "Por supuesto, enviaremos las toallas en unos minutos.",
      isGuest: false,
      timestamp: new Date(Date.now() - 8 * 60000),
    },
    {
      id: "msg3",
      guestId: "guest1",
      text: "Gracias. También me gustaría saber a qué hora abren el restaurante.",
      isGuest: true,
      timestamp: new Date(Date.now() - 5 * 60000),
    },
  ],
  guest2: [
    {
      id: "msg4",
      guestId: "guest2",
      text: "Hola, ¿podrían indicarme el horario del desayuno?",
      isGuest: true,
      timestamp: new Date(Date.now() - 60 * 60000),
    },
    {
      id: "msg5",
      guestId: "guest2",
      text: "El desayuno se sirve de 7:00 a 10:30 en el restaurante principal.",
      isGuest: false,
      timestamp: new Date(Date.now() - 58 * 60000),
    },
    {
      id: "msg6",
      guestId: "guest2",
      text: "Perfecto, muchas gracias.",
      isGuest: true,
      timestamp: new Date(Date.now() - 55 * 60000),
    },
  ],
  guest3: [
    {
      id: "msg7",
      guestId: "guest3",
      text: "Mensaje de voz",
      isGuest: true,
      isAudio: true,
      timestamp: new Date(Date.now() - 47 * 60000),
    },
  ],
};

const ReceptionDashboard = () => {
  const [guests, setGuests] = useState<Guest[]>(MOCK_GUESTS);
  const [messages, setMessages] = useState<Record<string, Message[]>>(MOCK_MESSAGES);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const selectGuest = (guest: Guest) => {
    setSelectedGuest(guest);
    // Marcar mensajes como leídos
    const updatedGuests = guests.map(g => 
      g.id === guest.id ? { ...g, unreadMessages: 0 } : g
    );
    setGuests(updatedGuests);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('es', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatLastActivity = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "Ahora mismo";
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `Hace ${hours} h`;
  };

  const sendReply = () => {
    if (replyText.trim() === "" || !selectedGuest) return;

    const newMessage: Message = {
      id: `msg${Date.now()}`,
      guestId: selectedGuest.id,
      text: replyText,
      isGuest: false,
      timestamp: new Date(),
    };

    const updatedMessages = {
      ...messages,
      [selectedGuest.id]: [...(messages[selectedGuest.id] || []), newMessage],
    };

    setMessages(updatedMessages);
    setReplyText("");
  };

  const toggleRecording = () => {
    // Simular grabación - en una implementación real conectaríamos con WebRTC
    setIsRecording(!isRecording);
    if (isRecording) {
      // Simular fin de grabación
      setTimeout(() => {
        if (selectedGuest) {
          const newAudioMessage: Message = {
            id: `msg${Date.now()}`,
            guestId: selectedGuest.id,
            text: "Mensaje de voz",
            isGuest: false,
            isAudio: true,
            timestamp: new Date(),
          };

          const updatedMessages = {
            ...messages,
            [selectedGuest.id]: [...(messages[selectedGuest.id] || []), newAudioMessage],
          };

          setMessages(updatedMessages);
        }
        setIsRecording(false);
      }, 2000);
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
            {guests.map((guest) => (
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
                        Hab. {guest.room}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatLastActivity(guest.lastActivity)}
                    </p>
                  </div>
                  {guest.unreadMessages > 0 && (
                    <div className="bg-hotel-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs">
                      {guest.unreadMessages}
                    </div>
                  )}
                </div>
              </div>
            ))}
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
                    <p className="text-sm text-gray-500">Habitación {selectedGuest.room}</p>
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
                      className={`flex ${msg.isGuest ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 ${
                          !msg.isGuest ? 'chat-bubble-guest' : 'chat-bubble-staff'
                        }`}
                      >
                        {msg.isAudio ? (
                          <div className="flex items-center space-x-2">
                            <Mic className="h-5 w-5" />
                            <span>{msg.isGuest ? "Audio recibido" : "Audio enviado"}</span>
                          </div>
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

              <div className="p-4 border-t bg-white">
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
                    placeholder="Escriba su respuesta..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendReply()}
                    className="flex-grow"
                    disabled={isRecording}
                  />
                  
                  <Button
                    type="button"
                    onClick={sendReply}
                    disabled={replyText.trim() === "" || isRecording}
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
