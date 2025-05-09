
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import GuestRegistrationForm from "@/components/GuestRegistrationForm";
import GuestChat from "@/components/GuestChat";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Hotel } from "lucide-react";
import { showGlobalAlert } from "@/hooks/use-alerts";

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
  const [roomData, setRoomData] = useState<{room_number: string, type: string | null, status: string | null} | null>(null);
  // Flag to prevent duplicate toasts
  const [hasShownRegistrationToast, setHasShownRegistrationToast] = useState(false);
  const [hasShownOccupiedAlert, setHasShownOccupiedAlert] = useState(false);

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

  // Get room information if roomIdFromUrl is provided - with shorter animation time
  useEffect(() => {
    const fetchRoomData = async () => {
      if (roomIdFromUrl) {
        try {
          const { data, error } = await supabase
            .from('rooms')
            .select('room_number, type, status')
            .eq('id', roomIdFromUrl)
            .single();
          
          if (error) throw error;
          if (data) {
            setRoomData(data);
            setShowWelcome(true);
            
            // Hide welcome message after 1s
            setTimeout(() => {
              setShowWelcome(false);
            }, 1000);
            
            // Show temporary alert if the cabin is occupied and haven't shown it yet
            if (data.status === 'occupied' && !hasShownOccupiedAlert) {
              setTimeout(() => {
                showGlobalAlert({
                  title: "Cabaña no disponible",
                  description: `La cabaña ${data.room_number} está ocupada. Por favor seleccione otra cabaña.`,
                  variant: "destructive",
                  duration: 6000
                });
                setHasShownOccupiedAlert(true);
              }, 1500);
            }
          }
        } catch (error) {
          console.error("Error fetching room data:", error);
        }
      }
    };

    fetchRoomData();
  }, [roomIdFromUrl, hasShownOccupiedAlert]);

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
    setHasShownOccupiedAlert(false);
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

  // Simplified welcome screen that's only shown briefly
  return (
    <div className="min-h-screen w-full bg-gray-50">
      {showWelcome && roomData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-hotel-600 bg-opacity-95 text-white p-6"
        >
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-full p-5 mb-4"
          >
            <Hotel className="h-12 w-12 text-hotel-600" />
          </motion.div>
          
          <motion.h1
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl md:text-4xl font-bold text-center mb-2"
          >
            Cabaña {roomData.room_number}
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-2 text-sm text-white/80"
          >
            {roomData.type && `${getRoomTypeText(roomData.type)}`}
          </motion.p>
        </motion.div>
      )}

      <div className="h-full">
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
    </div>
  );
};

export default GuestPortal;
