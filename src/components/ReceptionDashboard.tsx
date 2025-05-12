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
const ReceptionDashboard = ({
  onCallGuest
}: ReceptionDashboardProps) => {
  const isMobile = useIsMobile();
  const [showGuestList, setShowGuestList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
    // No return value needed as we're returning void
  };
  const {
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isDeleting,
    guestToDelete,
    setGuestToDelete,
    deleteChat
  } = useChatDeletion(refreshGuestsList, messages => {
    // We're passing an updater function here to avoid the useState setter type issues
    const newMessages = {
      ...messages
    };
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

  // Scroll to bottom when messages change
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end"
      });
    }
  };

  // Load messages when selecting a guest
  useEffect(() => {
    if (selectedGuest) {
      const loadMessages = async () => {
        await loadGuestMessages(selectedGuest.id);
        // Scroll to bottom after messages are loaded
        setTimeout(() => scrollToBottom(false), 100);
      };
      loadMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGuest]);

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
              <div className="p-4 gradient-header flex items-center fixed top-14 left-0 right-0 z-10 my-[12px] py-[12px]">
                <h2 className="text-lg font-semibold flex items-center text-white">
                  <User className="mr-2 h-5 w-5" />
                  Huéspedes
                </h2>
              </div>
              
              <div className="pt-28">
                <GuestList guests={guests} rooms={rooms} selectedGuest={selectedGuest} isMobile={true} recentlyUpdatedGuests={recentlyUpdatedGuests} onSelectGuest={selectGuest} onDeleteGuest={handleDeleteGuestClick} />
              </div>
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
              <ChatHeader selectedGuest={selectedGuest} onCallGuest={handleCallGuest} onDeleteChat={() => setIsDeleteDialogOpen(true)} onBackToList={handleBackToGuestList} isMobile={true} rooms={rooms} />

              <div className="flex-grow overflow-auto pb-16 pt-28">
                <MessageList messages={messages[selectedGuest.id] || []} isMobile={true} onRefreshRequest={refreshCurrentGuestMessages} />
              </div>

              <MessageInputPanel selectedGuest={selectedGuest} replyText={replyText} setReplyText={setReplyText} isLoading={isLoading} selectedFile={selectedFile} onFileSelect={handleFileSelect} onSendMessage={handleSendMessage} onAudioRecorded={handleAudioRecorded} onAudioCanceled={() => console.log("Audio recording cancelled")} isMobile={true} />
            </motion.div>}
        </AnimatePresence>
        
        <DeleteChatDialog isOpen={isDeleteDialogOpen} guestName={(guestToDelete || selectedGuest)?.name || ""} roomNumber={(guestToDelete || selectedGuest)?.room_number || ""} onConfirm={handleDeleteConfirm} onCancel={() => {
        setIsDeleteDialogOpen(false);
        setGuestToDelete(null);
      }} isDeleting={isDeleting} />
      </div>;
  }

  // Desktop layout with side-by-side panels
  return <div className="flex h-full">
      <div className="w-1/3 border-r bg-white shadow-sm">
        <div className="p-4 bg-gradient-to-r from-hotel-600 to-hotel-500 text-white flex justify-between items-center fixed top-14 left-0 z-10 w-1/3">
          <h2 className="text-xl font-semibold flex items-center">
            <User className="mr-2 h-5 w-5" />
            Huéspedes
          </h2>
          <ConnectionStatusIndicator className="bg-white/10 text-white" />
        </div>
        
        <div className="pt-28">
          <GuestList guests={guests} rooms={rooms} selectedGuest={selectedGuest} isMobile={false} recentlyUpdatedGuests={recentlyUpdatedGuests} onSelectGuest={selectGuest} onDeleteGuest={handleDeleteGuestClick} />
        </div>
      </div>
      
      <div className="flex-1 flex flex-col relative">
        {selectedGuest ? <>
            <ChatHeader selectedGuest={selectedGuest} onCallGuest={handleCallGuest} onDeleteChat={() => setIsDeleteDialogOpen(true)} onBackToList={handleBackToGuestList} isMobile={false} rooms={rooms} />
            
            <div className="flex-grow overflow-auto pb-16 pt-28">
              <MessageList messages={messages[selectedGuest.id] || []} isMobile={false} onRefreshRequest={refreshCurrentGuestMessages} />
            </div>
            
            <MessageInputPanel selectedGuest={selectedGuest} replyText={replyText} setReplyText={setReplyText} isLoading={isLoading} selectedFile={selectedFile} onFileSelect={handleFileSelect} onSendMessage={handleSendMessage} onAudioRecorded={handleAudioRecorded} onAudioCanceled={() => console.log("Audio recording cancelled")} isMobile={false} />
          </> : <NoGuestSelected />}
      </div>
      
      <DeleteChatDialog isOpen={isDeleteDialogOpen} guestName={(guestToDelete || selectedGuest)?.name || ""} roomNumber={(guestToDelete || selectedGuest)?.room_number || ""} onConfirm={handleDeleteConfirm} onCancel={() => {
      setIsDeleteDialogOpen(false);
      setGuestToDelete(null);
    }} isDeleting={isDeleting} />
    </div>;
};
export default ReceptionDashboard;