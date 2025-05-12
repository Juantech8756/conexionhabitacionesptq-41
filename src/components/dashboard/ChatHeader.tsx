
import React from "react";
import { Button } from "@/components/ui/button";
import { Phone, Trash2, ArrowLeft } from "lucide-react";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import { Guest } from "@/types/dashboard";

interface ChatHeaderProps {
  selectedGuest: Guest;
  onCallGuest: () => void;
  onDeleteChat: () => void;
  onBackToList: () => void;
  isMobile: boolean;
  rooms: Record<string, any>;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedGuest,
  onCallGuest,
  onDeleteChat,
  onBackToList,
  isMobile,
  rooms
}) => {
  const getRoomInfo = (guest: Guest) => {
    if (guest.room_id && rooms[guest.room_id]) {
      const room = rooms[guest.room_id];
      return <div className="flex flex-col mt-1">
          <div className="text-xs text-gray-500">
            {room.type && <span className="mr-2">
                {room.type === 'family' ? 'Cabaña familiar' : room.type === 'couple' ? 'Cabaña pareja' : room.type}
              </span>}
            {room.floor && <span className="mr-2">Piso {room.floor}</span>}
            {guest.guest_count && <span className="font-medium text-hotel-600">
                {guest.guest_count} {guest.guest_count === 1 ? 'Hospedado' : 'Hospedados'}
              </span>}
          </div>
        </div>;
    }
    return null;
  };

  // Mobile header
  if (isMobile) {
    return <header className="bg-gradient-to-r from-hotel-600 to-hotel-500 p-2 text-white shadow-sm fixed top-14 left-0 right-0 z-20 px-[9px] py-[8px] my-[11px]">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="mr-2 text-white hover:bg-white/20" onClick={onBackToList}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-grow">
            <h2 className="text-base font-semibold">{selectedGuest.name}</h2>
            <p className="text-xs text-white/90 flex items-center">
              <span>Cabaña {selectedGuest.room_number}</span>
              {selectedGuest.guest_count && <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
                  {selectedGuest.guest_count} {selectedGuest.guest_count === 1 ? 'Hospedado' : 'Hospedados'}
                </span>}
            </p>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={onDeleteChat} className="text-white hover:bg-white/20 mr-1" title="Eliminar chat">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onCallGuest} className="text-white hover:bg-white/20" title="Llamar a huésped">
              <Phone className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>;
  }

  // Desktop header
  return <header className="p-3 bg-white border-b shadow-sm sticky top-[104px] z-10 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{selectedGuest.name}</h2>
          <p className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
            <span>Cabaña {selectedGuest.room_number}</span>
            
            {selectedGuest.guest_count && <span className="bg-blue-50 text-hotel-700 px-2 py-0.5 rounded-full text-xs font-medium">
                {selectedGuest.guest_count} {selectedGuest.guest_count === 1 ? 'Hospedado' : 'Hospedados'}
              </span>}
            
            {selectedGuest.wait_time_minutes && selectedGuest.wait_time_minutes > 0 ? <span className="text-amber-600 text-xs">
                Esperando respuesta: {selectedGuest.wait_time_minutes} min
              </span> : null}
          </p>
          {getRoomInfo(selectedGuest)}
        </div>
        
        <div className="flex items-center gap-2">
          <ConnectionStatusIndicator />
          
          <Button size="sm" variant="outline" onClick={onDeleteChat} className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
            <Trash2 className="h-3 w-3 mr-1" />
            <span className="text-xs">Eliminar chat</span>
          </Button>
          
          <Button size="sm" onClick={onCallGuest} className="bg-green-500 hover:bg-green-600 text-xs">
            <Phone className="h-3 w-3 mr-1" />
            Llamar
          </Button>
        </div>
      </div>
    </header>;
};

export default ChatHeader;
