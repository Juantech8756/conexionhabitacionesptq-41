import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Trash, Users, MessageSquare } from "lucide-react";
import { Guest, Room } from "@/types/dashboard";

interface ChatHeaderProps {
  selectedGuest: Guest;
  onBackClick?: () => void;
  onDeleteChat?: () => void;
  onCallGuest?: () => void;
  isMobile: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedGuest,
  onBackClick,
  onDeleteChat,
  onCallGuest,
  isMobile
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0.5, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="border-b bg-gradient-to-r from-hotel-800 to-hotel-700 shadow-sm sticky top-0 z-10 chat-header-minimal"
    >
      <div className="flex items-center h-full px-4">
        <Button
          variant="ghost"
          onClick={onBackClick || (() => console.log('No back handler provided'))}
          className="flex items-center gap-1 text-white hover:bg-white/20 rounded-md h-9 back-button-reception"
          aria-label="Volver a la lista de huéspedes"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Ver todos los chats</span>
        </Button>
        
        <div className="flex items-center gap-2.5 flex-1 overflow-hidden ml-2">
          <MessageSquare className="h-5 w-5 text-white/90 flex-shrink-0" />
          <div className="flex flex-col min-w-0 w-full">
            <h2 className="text-lg font-medium leading-tight text-white truncate">
              {selectedGuest.name}
            </h2>
            
            <div className="flex items-center mt-1 space-x-3">
              <span className="text-white/90 text-sm flex items-center">
                <Home className="h-3.5 w-3.5 mr-1 text-white/80" />
                {selectedGuest.room_number}
              </span>
              
              {selectedGuest.guest_count && (
                <span className="text-white/90 text-sm flex items-center">
                  <Users className="h-3.5 w-3.5 mr-1 text-white/80" />
                  {selectedGuest.guest_count}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {onDeleteChat && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteChat}
            className="text-white hover:bg-white/20 flex-shrink-0 ml-2"
            title="Eliminar chat"
          >
            <Trash className="h-4 w-4 trash-icon" />
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default ChatHeader;