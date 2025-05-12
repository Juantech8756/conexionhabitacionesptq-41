
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import MessageNotificationBadge from "@/components/MessageNotificationBadge";
import { Guest, Room } from "@/types/dashboard";

interface GuestListProps {
  guests: Guest[];
  rooms: Record<string, Room>;
  selectedGuest: Guest | null;
  isMobile: boolean;
  recentlyUpdatedGuests: Record<string, boolean>;
  onSelectGuest: (guest: Guest) => void;
  onDeleteGuest: (e: React.MouseEvent, guest: Guest) => void;
}

const GuestList: React.FC<GuestListProps> = ({
  guests,
  rooms,
  selectedGuest,
  isMobile,
  recentlyUpdatedGuests,
  onSelectGuest,
  onDeleteGuest,
}) => {
  // Format last activity time
  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString);
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "Ahora mismo";
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    return date.toLocaleDateString('es');
  };

  // Get room info if available
  const getRoomInfo = (guest: Guest) => {
    if (guest.room_id && rooms[guest.room_id]) {
      const room = rooms[guest.room_id];
      return (
        <div className="flex flex-col mt-1">
          <div className="text-xs text-gray-500">
            {room.type && (
              <span className="mr-2">
                {room.type === 'family' 
                  ? 'Cabaña familiar' 
                  : room.type === 'couple' 
                    ? 'Cabaña pareja' 
                    : room.type}
              </span>
            )}
            {room.floor && <span className="mr-2">Piso {room.floor}</span>}
            {guest.guest_count && (
              <span className="font-medium text-hotel-600">
                {guest.guest_count} {guest.guest_count === 1 ? 'Hospedado' : 'Hospedados'}
              </span>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Handle empty guests list
  if (guests.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 text-gray-500 text-center"
      >
        No hay huéspedes registrados
      </motion.div>
    );
  }

  return (
    <ScrollArea className={isMobile ? "h-[calc(100%-64px)]" : "h-[calc(100%-65px)]"}>
      <AnimatePresence>
        {guests.map((guest) => (
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
              selectedGuest?.id === guest.id && !isMobile
                ? "bg-blue-50 border-l-4 border-l-hotel-600" 
                : ""
            }`}
          >
            <div className="flex justify-between items-start">
              <div 
                className="cursor-pointer flex-grow" 
                onClick={() => onSelectGuest(guest)}
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
                  onClick={(e) => onDeleteGuest(e, guest)}
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
        ))}
      </AnimatePresence>
    </ScrollArea>
  );
};

export default GuestList;
