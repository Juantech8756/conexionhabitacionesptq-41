import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Phone, Trash, Users, MessageSquare } from "lucide-react";
import { Guest, Room } from "@/types/dashboard";

interface ChatHeaderProps {
  selectedGuest: Guest;
  onCallGuest: () => void;
  onDeleteChat: () => void;
  onBackToList: () => void;
  isMobile: boolean;
  rooms: Record<string, Room>;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedGuest,
  onCallGuest,
  onDeleteChat,
  onBackToList,
  isMobile,
  rooms
}) => {
  // Get room info as badges
  const getRoomBadges = () => {
    const roomInfo = selectedGuest.room_id && rooms[selectedGuest.room_id] ? rooms[selectedGuest.room_id] : null;
    
    return (
      <div className="flex items-center flex-wrap gap-0.5">
        <span className="inline-flex items-center bg-white/20 px-1 py-0.5 rounded-full text-[9px] leading-none">
          <Home className="h-2 w-2 text-white/90 mr-0.5" />
          {selectedGuest.room_number}
        </span>
        
        {roomInfo?.type && (
          <span className="inline-flex items-center bg-white/20 px-1 py-0.5 rounded-full text-[9px] leading-none">
            {roomInfo.type === 'family' ? 'Fam' : roomInfo.type === 'couple' ? 'Par' : roomInfo.type}
          </span>
        )}
        
        {selectedGuest.guest_count && (
          <span className="inline-flex items-center bg-white/30 px-1 py-0.5 rounded-full text-[9px] leading-none">
            <Users className="h-2 w-2 mr-0.5" />
            {selectedGuest.guest_count}
          </span>
        )}
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0.5, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="border-b bg-gradient-to-r from-hotel-800 to-hotel-700 shadow-sm sticky top-0 z-10 h-10"
    >
      <div className="flex items-center justify-between h-full px-2">
        <div className="flex items-center gap-1">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBackToList}
              className="h-6 w-6 text-white hover:bg-white/20 rounded-full flex-shrink-0 p-0"
              aria-label="Volver a la lista de huéspedes"
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>
          )}
          
          <div className="flex items-center">
            <MessageSquare className="h-3 w-3 text-white/90 mr-1 flex-shrink-0" />
            <div className="flex flex-col">
              <h2 className="text-xs font-medium leading-tight text-white truncate max-w-[140px]">
                {selectedGuest.name}
              </h2>
              <div className="text-white/90">
                {getRoomBadges()}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCallGuest}
            className="border border-white/30 text-white hover:bg-white/20 rounded-full h-6 px-1.5 min-w-0"
          >
            <Phone className="h-2.5 w-2.5 mr-0.5" />
            <span className="text-[9px]">Llamar</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteChat}
            className="border border-white/30 text-white hover:bg-red-500/20 rounded-full h-6 px-1.5 min-w-0"
          >
            <Trash className="h-2.5 w-2.5 mr-0.5" />
            <span className="text-[9px]">Eliminar</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatHeader;