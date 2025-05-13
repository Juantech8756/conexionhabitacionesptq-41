import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, Home, Users } from "lucide-react";
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
        <div className="flex flex-col mt-0.5">
          <div className={`flex items-center ${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground gap-2`}>
            {room.type && (
              <span className="flex items-center">
                <Home className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-1`} />
                {room.type === 'family' 
                  ? 'Cabaña familiar' 
                  : room.type === 'couple' 
                    ? 'Cabaña pareja' 
                    : room.type}
              </span>
            )}
            {guest.guest_count && (
              <span className="flex items-center font-medium text-primary">
                <Users className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-1`} />
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
      <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
        <div className="rounded-full bg-muted p-3 mb-4">
          <Users className="h-6 w-6" />
        </div>
        <p className="text-center">No hay huéspedes registrados</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <AnimatePresence>
        {guests.map((guest) => (
          <motion.div 
            key={guest.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              backgroundColor: recentlyUpdatedGuests[guest.id] ? 'var(--highlight-background)' : 'transparent'
            }}
            transition={{
              duration: 0.2,
              backgroundColor: { duration: 1 }
            }}
            className={`${isMobile ? 'py-2 px-3' : 'p-4'} border-b hover:bg-accent/50 transition-colors ${
              selectedGuest?.id === guest.id
                ? "bg-accent border-l-4 border-l-primary" 
                : ""
            }`}
          >
            <div className="flex justify-between items-start">
              <div 
                className="cursor-pointer flex-grow" 
                onClick={() => onSelectGuest(guest)}
              >
                <p className={`font-medium ${isMobile ? 'text-sm' : ''} flex items-center flex-wrap`}>
                  {guest.name} 
                  <span className={`ml-2 ${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                    Cabaña {guest.room_number}
                  </span>
                </p>
                
                {getRoomInfo(guest)}
                
                <p className={`${isMobile ? 'text-[10px] mt-0.5' : 'text-xs mt-1'} text-muted-foreground`}>
                  {formatLastActivity(guest.last_activity)}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`${isMobile ? 'h-7 w-7' : 'h-8 w-8'} text-destructive hover:text-destructive-foreground hover:bg-destructive/10`}
                  onClick={(e) => onDeleteGuest(e, guest)}
                  title="Eliminar conversación"
                >
                  <Trash2 className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
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
