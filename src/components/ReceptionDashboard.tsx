import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Home, Users, ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import DeleteChatDialog from "@/components/DeleteChatDialog";
import { useGuestData } from "@/hooks/use-guest-data";
import { useMessageActions } from "@/hooks/use-message-actions";
import { useChatDeletion } from "@/hooks/use-chat-deletion";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";

// Imported components
import GuestList from "@/components/dashboard/GuestList";
import MessageList from "@/components/dashboard/MessageList";
import MessageInputPanel from "@/components/dashboard/MessageInputPanel";
import ChatHeader from "@/components/dashboard/ChatHeader";
import NoGuestSelected from "@/components/dashboard/NoGuestSelected";

// Componente de indicador de typing para el lado del receptor
const TypingIndicator = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;
  
  return (
    <div className="flex items-center space-x-1 text-gray-500 p-2 animate-in fade-in ml-4 mb-2">
      <span className="text-xs">Escribiendo...</span>
      <div className="flex space-x-1">
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.6s]"></div>
      </div>
    </div>
  );
};

interface ReceptionDashboardProps {
  onCallGuest?: (guest: {
    id: string;
    name: string;
    roomNumber: string;
  }) => void;
  typingGuests?: Record<string, boolean>;
  typingGuestInfo?: Record<string, { name: string; room: string }>;
  onSendTypingEvent?: (guestId: string) => Promise<void>;
}

const ReceptionDashboard = ({ 
  onCallGuest,
  typingGuests = {},
  typingGuestInfo = {},
  onSendTypingEvent 
}: ReceptionDashboardProps) => {
  const isMobile = useIsMobile();
  const [showGuestList, setShowGuestList] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());

  //  hooks personalizados
  const {
    guests,
    rooms,
    messages,
    selectedGuest,
    setSelectedGuest,
    recentlyUpdatedGuests,
    refreshGuestsList,
    updateResponseStatus,
    loadGuestMessages
  } = useGuestData();

  const {
    replyText,
    setReplyText,
    isLoading,
    selectedFile,
    handleFileSelect,
    handleSendMessage,
    handleAudioRecorded: originalHandleAudioRecorded,
    handleMediaUploadComplete
  } = useMessageActions(selectedGuest, updateResponseStatus);

  // Wrapper function to convert Promise<boolean> to Promise<void>
  const handleAudioRecorded = async (audioBlob: Blob): Promise<void> => {
    await originalHandleAudioRecorded(audioBlob);
  };

  // Estado para controlar cuando el recepcionista está escribiendo
  const [isTyping, setIsTyping] = useState(false);

  // Función para manejar el cambio en el input con indicador de typing
  const handleReplyChange = (value: React.SetStateAction<string>) => {
    setReplyText(value);
    
    // Disparar evento de typing si el usuario está escribiendo y hay un huésped seleccionado
    if (selectedGuest && typeof value === 'string' && value.trim() !== '' && onSendTypingEvent) {
      onSendTypingEvent(selectedGuest.id);
    }
  };

  const {
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isDeleting,
    guestToDelete,
    setGuestToDelete,
    deleteChat
  } = useChatDeletion(refreshGuestsList, messages => {
    const newMessages = { ...messages };
    if (selectedGuest) {
      delete newMessages[selectedGuest.id];
    }
    return newMessages;
  });

  // Function to refresh messages for the current guest
  const refreshCurrentGuestMessages = useCallback(() => {
    if (selectedGuest) {
      loadGuestMessages(selectedGuest.id);
      setLastRefreshTime(Date.now());
    }
  }, [selectedGuest, loadGuestMessages]);

  // Add automatic refresh effect
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (selectedGuest) {
        refreshCurrentGuestMessages();
      }
    }, 500); // Refresh every 500ms for more immediate updates

    return () => clearInterval(intervalId);
  }, [selectedGuest, refreshCurrentGuestMessages]);

  // Load messages when selecting a guest
  useEffect(() => {
    if (selectedGuest) {
      const loadMessages = async () => {
        await loadGuestMessages(selectedGuest.id);
      };
      loadMessages();
    }
  }, [selectedGuest, loadGuestMessages]);

  // Call guest handler
  const handleCallGuest = () => {
    if (selectedGuest && onCallGuest) {
      onCallGuest({
        id: selectedGuest.id,
        name: selectedGuest.name,
        roomNumber: selectedGuest.room_number
      });
    }
  };

  // Select a guest
  const selectGuest = (guest: typeof selectedGuest) => {
    if (!guest) return;
    setSelectedGuest(guest);

    // Mark messages as read (for UI purposes)
    const updatedGuests = guests.map(g => g.id === guest.id ? {
      ...g,
      unread_messages: 0
    } : g);
    if (isMobile) {
      setShowGuestList(false);
    }
  };

  // Back to guests list (mobile)
  const handleBackToGuestList = () => {
    // Siempre deseleccionar el huésped actual, sin importar si es móvil o escritorio
    setSelectedGuest(null);
    console.log("Volviendo a la lista de huéspedes");
  };

  // Delete guest action
  const handleDeleteGuestClick = (e: React.MouseEvent, guest: typeof selectedGuest) => {
    e.stopPropagation(); // Prevent selecting the guest when clicking delete
    if (!guest) return;
    setGuestToDelete(guest);
    setIsDeleteDialogOpen(true);
  };

  // Handle delete dialog confirm
  const handleDeleteConfirm = async () => {
    await deleteChat(selectedGuest);

    // If the deleted guest is the currently selected guest, deselect it
    if (selectedGuest && guestToDelete && selectedGuest.id === guestToDelete.id) {
      setSelectedGuest(null);
    }
  };

  // Mobile layout with sliding panels
  if (isMobile) {
    return (
      <div className="flex h-full overflow-hidden bg-background">
        <AnimatePresence initial={false}>
          {!selectedGuest ? (
            <motion.div 
              key="guest-list" 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -10 }} 
              transition={{ duration: 0.2 }}
              className="w-full h-full flex flex-col"
            >
              <div className="bg-gradient-to-r from-hotel-800 to-hotel-700 p-3 flex items-center justify-between">
                <h2 className="text-base font-semibold flex items-center text-white">
                  <User className="mr-2 h-4 w-4" />
                  Huéspedes
                </h2>
                <ConnectionStatusIndicator className="text-white" />
              </div>
              
              <div className="flex-1 overflow-hidden">
                <GuestList 
                  guests={guests} 
                  rooms={rooms} 
                  selectedGuest={selectedGuest} 
                  isMobile={true}
                  recentlyUpdatedGuests={recentlyUpdatedGuests} 
                  onSelectGuest={selectGuest} 
                  onDeleteGuest={handleDeleteGuestClick}
                  typingGuests={typingGuests}
                  typingGuestInfo={typingGuestInfo}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="chat-view" 
              initial={{ opacity: 0, x: 10 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: 10 }} 
              transition={{ duration: 0.2 }}
              className="w-full h-full flex flex-col"
            >
              {/* Header en la parte superior */}
              <ChatHeader 
                selectedGuest={selectedGuest} 
                onBackClick={undefined}
                onCallGuest={handleCallGuest} 
                onDeleteChat={() => {
                  setGuestToDelete(selectedGuest);
                  setIsDeleteDialogOpen(true);
                }}
                isMobile={true} 
              />
              
              {/* Header de información del cliente para móvil - Ahora con posición fija */}
              <div className="bg-white p-2 border-b shadow-sm client-info-header">
                <div className="flex flex-row items-center">
                  {/* Botón de retroceso */}
                  <button 
                    className="back-button-mobile"
                    onClick={handleBackToGuestList}
                    aria-label="Volver a la lista de huéspedes"
                  >
                    <span>← Volver</span>
                  </button>
                  
                  {/* Información del cliente */}
                  <div className="client-info-content">
                    <h3 className="font-medium text-base text-gray-800">
                      {selectedGuest.name}
                    </h3>
                    <div className="flex items-center space-x-3 mt-0.5">
                      <span className="text-xs text-gray-600 flex items-center">
                        <Home className="h-3.5 w-3.5 mr-1 text-hotel-600" />
                        Cabaña {selectedGuest.room_number}
                      </span>
                      {selectedGuest.guest_count && (
                        <span className="text-xs text-gray-600 flex items-center">
                          <Users className="h-3.5 w-3.5 mr-1 text-hotel-600" />
                          {selectedGuest.guest_count} {selectedGuest.guest_count === 1 ? 'Hospedado' : 'Hospedados'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Lista de mensajes - cuerpo de la conversación */}
              <div className="flex-1 overflow-hidden">
                <MessageList 
                  messages={messages[selectedGuest.id] || []} 
                  selectedGuest={selectedGuest} 
                  isMobile={true} 
                  onRefresh={refreshCurrentGuestMessages}
                />
                
                {/* Indicador de typing */}
                {typingGuests[selectedGuest.id] && (
                  <TypingIndicator visible={true} />
                )}
              </div>
              
              {/* Panel de entrada de mensajes - fijo en la parte inferior */}
              <MessageInputPanel 
                replyText={replyText}
                setReplyText={handleReplyChange}
                isLoading={isLoading}
                selectedFile={selectedFile}
                onFileSelect={handleFileSelect}
                onSendMessage={handleSendMessage}
                onAudioRecorded={handleAudioRecorded}
                onMediaUploadComplete={handleMediaUploadComplete}
                isMobile={true}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Delete dialog */}
        <DeleteChatDialog 
          isOpen={isDeleteDialogOpen} 
          isDeleting={isDeleting}
          guestName={guestToDelete?.name || ""}
          roomNumber={guestToDelete?.room_number || ""}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setIsDeleteDialogOpen(false)}
        />
      </div>
    );
  }

  // Desktop layout with two columns
  return (
    <div className="flex h-full overflow-hidden bg-background rounded-md">
      {/* Sidebar with guest list */}
      <div className="w-1/3 border-r border-border h-full flex flex-col">
        <div className="bg-gradient-to-r from-hotel-800 to-hotel-700 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center text-white">
            <User className="mr-2 h-5 w-5" />
            Huéspedes
          </h2>
          <ConnectionStatusIndicator className="text-white" />
        </div>
        
        <div className="flex-1 overflow-hidden">
          <GuestList 
            guests={guests} 
            rooms={rooms} 
            selectedGuest={selectedGuest} 
            isMobile={false}
            recentlyUpdatedGuests={recentlyUpdatedGuests} 
            onSelectGuest={selectGuest} 
            onDeleteGuest={handleDeleteGuestClick}
            typingGuests={typingGuests}
            typingGuestInfo={typingGuestInfo}
          />
        </div>
      </div>
      
      {/* Main chat area */}
      <div className="w-2/3 flex flex-col h-full">
        {selectedGuest ? (
          <>
            {/* Header para el chat */}
            <ChatHeader 
              selectedGuest={selectedGuest} 
              onBackClick={handleBackToGuestList}
              onCallGuest={handleCallGuest} 
              onDeleteChat={() => {
                setGuestToDelete(selectedGuest);
                setIsDeleteDialogOpen(true);
              }}
              isMobile={false} 
            />
            
            {/* Header de información del cliente */}
            <div className="bg-white p-3 border-b shadow-sm client-info-header">
              <div className="flex flex-col">
                <h3 className="font-medium text-lg text-gray-800">
                  {selectedGuest.name}
                </h3>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-sm text-gray-600 flex items-center">
                    <Home className="h-4 w-4 mr-1 text-hotel-600" />
                    Cabaña {selectedGuest.room_number}
                  </span>
                  {selectedGuest.guest_count && (
                    <span className="text-sm text-gray-600 flex items-center">
                      <Users className="h-4 w-4 mr-1 text-hotel-600" />
                      {selectedGuest.guest_count} {selectedGuest.guest_count === 1 ? 'Hospedado' : 'Hospedados'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Lista de mensajes */}
            <div className="flex-1 overflow-hidden">
              <MessageList 
                messages={messages[selectedGuest.id] || []} 
                selectedGuest={selectedGuest}
                isMobile={false}
                onRefresh={refreshCurrentGuestMessages}
              />
              
              {/* Indicador de typing */}
              {typingGuests[selectedGuest.id] && (
                <TypingIndicator visible={true} />
              )}
            </div>
            
            {/* Panel de entrada de mensajes */}
            <MessageInputPanel 
              replyText={replyText}
              setReplyText={handleReplyChange}
              isLoading={isLoading}
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              onSendMessage={handleSendMessage}
              onAudioRecorded={handleAudioRecorded}
              onMediaUploadComplete={handleMediaUploadComplete}
              isMobile={false}
            />
          </>
        ) : (
          <NoGuestSelected />
        )}
      </div>
      
      {/* Delete dialog */}
      <DeleteChatDialog 
        isOpen={isDeleteDialogOpen} 
        isDeleting={isDeleting}
        guestName={guestToDelete?.name || ""}
        roomNumber={guestToDelete?.room_number || ""}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
};

export default ReceptionDashboard;