import { useState, useEffect, useCallback } from "react";
import ReceptionDashboard from "@/components/ReceptionDashboard";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface ReceptionDashboardWrapperProps {
  onStartCall: (guest: {id: string; name: string; roomNumber: string}) => void;
  onEndCall: () => void;
  isCallActive: boolean;
  selectedGuest: {
    id: string;
    name: string;
    roomNumber: string;
  } | null;
}

// Componente de indicador de escritura para huésped
const GuestTypingIndicator = ({ visible, guestName }: { visible: boolean; guestName: string }) => {
  if (!visible) return null;
  
  return (
    <div className="flex items-center space-x-1 text-gray-500 py-1 px-2 animate-in fade-in">
      <span className="text-xs">{guestName} está escribiendo</span>
      <div className="flex space-x-1">
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.6s]"></div>
      </div>
    </div>
  );
};

const ReceptionDashboardWrapper = ({ 
  onStartCall,
  onEndCall,
  isCallActive,
  selectedGuest
}: ReceptionDashboardWrapperProps) => {
  // Wrapper component to handle dashboard functionality
  
  // Agregar estado para guardar qué huéspedes están escribiendo
  const [typingGuests, setTypingGuests] = useState<Record<string, boolean>>({});
  const [typingGuestInfo, setTypingGuestInfo] = useState<Record<string, { name: string, room: string }>>({});
  
  // Agregar un useEffect para suscribirse a los eventos de typing de los huéspedes
  useEffect(() => {
    // Crear un canal para recibir eventos de typing de todos los huéspedes
    const typingChannel = supabase.channel(`typing-reception`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { guestId, isTyping, guestName, roomNumber } = payload.payload;
        
        // Actualizar el estado de typing para este huésped
        setTypingGuests(prev => ({
          ...prev,
          [guestId]: isTyping
        }));
        
        // Guardar información del huésped
        if (guestName && roomNumber) {
          setTypingGuestInfo(prev => ({
            ...prev,
            [guestId]: { name: guestName, room: roomNumber }
          }));
        }
        
        // Desactivar el indicador después de 3 segundos si no se reciben más eventos
        if (isTyping) {
          setTimeout(() => {
            setTypingGuests(prev => ({
              ...prev,
              [guestId]: false
            }));
          }, 3000);
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, []);
  
  // Función para enviar evento de typing a un huésped específico
  const sendTypingEvent = useCallback(async (guestId: string) => {
    if (!guestId) return;
    
    await supabase.channel(`typing-${guestId}`)
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: { 
          guestId,
          isTyping: true
        }
      });
  }, []);
  
  return (
    <div className="flex flex-col h-full">
      {/* Pasar la función de typing y el estado a ReceptionDashboard */}
      <ReceptionDashboard 
        onCallGuest={onStartCall} 
        typingGuests={typingGuests}
        typingGuestInfo={typingGuestInfo}
        onSendTypingEvent={sendTypingEvent}
      />
    </div>
  );
};

export default ReceptionDashboardWrapper;
