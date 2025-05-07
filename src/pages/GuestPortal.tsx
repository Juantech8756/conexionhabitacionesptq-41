
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import GuestRegistrationForm from "@/components/GuestRegistrationForm";
import GuestChat from "@/components/GuestChat";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Hotel } from "lucide-react";

const GuestPortal = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [guestId, setGuestId] = useState("");
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const roomIdFromUrl = searchParams.get('room');
  
  // States for welcome animation
  const [showWelcome, setShowWelcome] = useState(false);
  const [roomData, setRoomData] = useState<{room_number: string, type: string | null} | null>(null);
  // Flag to prevent duplicate toasts
  const [hasShownRegistrationToast, setHasShownRegistrationToast] = useState(false);

  // Check if the user has registered previously
  useEffect(() => {
    const checkLocalStorage = () => {
      const savedName = localStorage.getItem("guestName");
      const savedRoom = localStorage.getItem("roomNumber");
      const savedId = localStorage.getItem("guestId");
      
      if (savedName && savedRoom && savedId) {
        setGuestName(savedName);
        setRoomNumber(savedRoom);
        setGuestId(savedId);
        setIsRegistered(true);
        console.log("Usuario encontrado en localStorage, cargando chat...");
      } else {
        console.log("No se encontró información de usuario en localStorage");
      }
    };
    
    checkLocalStorage();
  }, []);

  // Get room information if roomIdFromUrl is provided
  useEffect(() => {
    const fetchRoomData = async () => {
      if (roomIdFromUrl) {
        try {
          const { data, error } = await supabase
            .from('rooms')
            .select('room_number, type')
            .eq('id', roomIdFromUrl)
            .single();
          
          if (error) throw error;
          if (data) {
            setRoomData(data);
            setShowWelcome(true);
            
            // Hide welcome message after 2.5 seconds
            setTimeout(() => {
              setShowWelcome(false);
            }, 2500);
          }
        } catch (error) {
          console.error("Error fetching room data:", error);
        }
      }
    };

    fetchRoomData();
  }, [roomIdFromUrl]);

  const handleRegister = async (name: string, room: string, id: string) => {
    console.log("Registro exitoso, configurando chat...", {name, room, id});
    // Guardar información de usuario
    setGuestName(name);
    setRoomNumber(room);
    setGuestId(id);
    
    // Guardar en localStorage para futuras visitas
    localStorage.setItem("guestName", name);
    localStorage.setItem("roomNumber", room);
    localStorage.setItem("guestId", id);
    
    // Mostrar toast solo si no se ha mostrado antes
    if (!hasShownRegistrationToast) {
      toast({
        title: "¡Registro exitoso!",
        description: "Ahora puede comunicarse con recepción",
        duration: 3000,
      });
      setHasShownRegistrationToast(true);
    }
    
    // Actualizar el estado isRegistered inmediatamente
    setIsRegistered(true);
  };

  const handleBackToRegistration = () => {
    // For testing, allow returning to the form
    setIsRegistered(false);
    localStorage.removeItem("guestName");
    localStorage.removeItem("roomNumber");
    localStorage.removeItem("guestId");
    setHasShownRegistrationToast(false);
  };

  const getRoomTypeText = (type: string | null) => {
    if (!type) return "";
    switch (type.toLowerCase()) {
      case "family":
        return "Familiar";
      case "couple":
        return "Pareja";
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen w-full overflow-auto bg-gray-50">
      <AnimatePresence>
        {showWelcome && roomData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-hotel-600 bg-opacity-95 text-white p-6"
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-full p-5 mb-6"
            >
              <Hotel className="h-16 w-16 text-hotel-600" />
            </motion.div>
            
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-4xl md:text-5xl font-bold text-center mb-2"
            >
              Cabaña {roomData.room_number}
            </motion.h1>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xl md:text-2xl font-light text-center"
            >
              {roomData.type && `${getRoomTypeText(roomData.type)}`}
            </motion.p>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 text-sm text-white/80"
            >
              Bienvenido al sistema de comunicación con recepción
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {isRegistered ? (
        <GuestChat
          guestName={guestName}
          roomNumber={roomNumber}
          guestId={guestId}
          onBack={handleBackToRegistration}
        />
      ) : (
        <GuestRegistrationForm 
          onRegister={handleRegister}
          preselectedRoomId={roomIdFromUrl || undefined}
          showSuccessToast={false} 
        />
      )}
    </div>
  );
};

export default GuestPortal;
