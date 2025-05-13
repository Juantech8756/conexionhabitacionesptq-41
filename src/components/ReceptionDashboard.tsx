import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User } from "lucide-react";
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

interface ReceptionDashboardProps {
  onCallGuest?: (guest: {
    id: string;
    name: string;
    roomNumber: string;
  }) => void;
}

const ReceptionDashboard = ({ onCallGuest }: ReceptionDashboardProps) => {
  const isMobile = useIsMobile();
  const [showGuestList, setShowGuestList] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());

  // Use custom hooks
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
    if (isMobile) {
      setSelectedGuest(null);
    }
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
                onCallGuest={handleCallGuest} 
                onDeleteChat={() => setIsDeleteDialogOpen(true)} 
                onBackToList={handleBackToGuestList} 
                isMobile={true} 
                rooms={rooms} 
              />

              {/* Zona de mensajes con scroll, ocupa todo el espacio disponible */}
              <div className="flex-1 overflow-y-auto bg-hotel-50/80">
                <MessageList 
                  messages={messages[selectedGuest.id] || []} 
                  isMobile={true} 
                  onRefreshRequest={refreshCurrentGuestMessages} 
                />
              </div>

              {/* Barra de entrada fija en la parte inferior */}
              <div className="border-t border-hotel-100 bg-white shadow-md w-full py-2 px-2 sticky bottom-0 left-0 right-0">
                <MessageInputPanel 
                  selectedGuest={selectedGuest} 
                  replyText={replyText} 
                  setReplyText={setReplyText} 
                  isLoading={isLoading} 
                  selectedFile={selectedFile} 
                  onFileSelect={handleFileSelect} 
                  onSendMessage={handleSendMessage} 
                  onAudioRecorded={handleAudioRecorded} 
                  onAudioCanceled={() => console.log("Audio recording cancelled")} 
                  isMobile={true} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <DeleteChatDialog 
          isOpen={isDeleteDialogOpen} 
          guestName={(guestToDelete || selectedGuest)?.name || ""} 
          roomNumber={(guestToDelete || selectedGuest)?.room_number || ""} 
          onConfirm={handleDeleteConfirm} 
          onCancel={() => {
            setIsDeleteDialogOpen(false);
            setGuestToDelete(null);
          }} 
          isDeleting={isDeleting} 
        />
      </div>
    );
  }

  // Desktop layout with side-by-side panels
  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Panel izquierdo: Lista de huéspedes */}
      <div className="w-1/3 border-r overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-hotel-800 to-hotel-700 p-3 flex justify-between items-center">
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
          />
        </div>
      </div>
      
      {/* Panel derecho: Chat */}
      <div className="flex-1 overflow-hidden">
        {selectedGuest ? (
          <div className="h-full flex flex-col">
            {/* ChatHeader - cabecera */}
            <ChatHeader 
              selectedGuest={selectedGuest} 
              onCallGuest={handleCallGuest} 
              onDeleteChat={() => setIsDeleteDialogOpen(true)} 
              onBackToList={handleBackToGuestList} 
              isMobile={false} 
              rooms={rooms} 
            />
            
            {/* MessageList - contenido con scroll */}
            <div className="flex-1 overflow-y-auto bg-hotel-50/80">
              <MessageList 
                messages={messages[selectedGuest.id] || []} 
                isMobile={false} 
                onRefreshRequest={refreshCurrentGuestMessages} 
              />
            </div>

            {/* MessageInputPanel - pie fijo */}
            <div className="border-t border-hotel-100 bg-white shadow-md w-full p-3">
              <MessageInputPanel 
                selectedGuest={selectedGuest} 
                replyText={replyText} 
                setReplyText={setReplyText} 
                isLoading={isLoading} 
                selectedFile={selectedFile} 
                onFileSelect={handleFileSelect} 
                onSendMessage={handleSendMessage} 
                onAudioRecorded={handleAudioRecorded} 
                onAudioCanceled={() => console.log("Audio recording cancelled")} 
                isMobile={false} 
              />
            </div>
          </div>
        ) : (
          <NoGuestSelected />
        )}
      </div>
      
      <DeleteChatDialog 
        isOpen={isDeleteDialogOpen} 
        guestName={(guestToDelete || selectedGuest)?.name || ""} 
        roomNumber={(guestToDelete || selectedGuest)?.room_number || ""} 
        onConfirm={handleDeleteConfirm} 
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