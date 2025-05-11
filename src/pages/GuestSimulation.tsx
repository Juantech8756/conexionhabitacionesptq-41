
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import GuestRegistrationFormWrapper from "@/components/GuestRegistrationFormWrapper";
import GuestChat from "@/components/GuestChat";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Hotel, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkExistingRegistration } from "@/utils/registration";
import { getRoomTypeText } from "@/utils/roomValidation";

const GuestSimulation = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [guestId, setGuestId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const roomIdFromUrl = searchParams.get('room');
  
  // States for welcome animation
  const [showWelcome, setShowWelcome] = useState(false);
  const [roomData, setRoomData] = useState<{room_number: string, type: string | null, status: string | null} | null>(null);
  // Flag to prevent duplicate toasts
  const [hasShownRegistrationToast, setHasShownRegistrationToast] = useState(true);
  // State to track if we're checking registration
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);

  // Check if the user has registered previously and load their chat
  useEffect(() => {
    const checkRegistration = async () => {
      console.log("[Simulation] Checking registration status with roomIdFromUrl:", roomIdFromUrl);
      setIsCheckingRegistration(true);
      
      try {
        // Specifically check for QR scanned room regardless of localStorage state
        if (roomIdFromUrl) {
          console.log("[Simulation] QR code scan detected, checking if the room already has a registration");
          
          // First, directly check if this room has any guest record
          const { data: existingRoomGuest, error } = await supabase
            .from('guests')
            .select('id, name, room_number, guest_count, room_id')
            .eq('room_id', roomIdFromUrl)
            .maybeSingle();
            
          if (error) {
            console.error("[Simulation] Error checking for existing room guests:", error);
          }
          
          // If a guest record exists for this room from any device, use that
          if (existingRoomGuest) {
            console.log("[Simulation] Found existing registration for this room:", existingRoomGuest);
            
            // Set up the chat with the existing registration
            setGuestName(existingRoomGuest.name);
            setRoomNumber(existingRoomGuest.room_number);
            setGuestId(existingRoomGuest.id);
            setRoomId(roomIdFromUrl);
            setIsRegistered(true);
          }

          // Get room data regardless of registration status
          const { data: room } = await supabase
            .from('rooms')
            .select('status, room_number, type')
            .eq('id', roomIdFromUrl)
            .maybeSingle();
            
          if (room) {
            setRoomData(room);
          }
        }
      } catch (error) {
        console.error("[Simulation] Error during registration check:", error);
        setIsRegistered(false);
      } finally {
        setIsCheckingRegistration(false);
      }
    };
    
    checkRegistration();
  }, [roomIdFromUrl, toast]);

  // Display welcome animation when room data is loaded
  useEffect(() => {
    if (roomData && !showWelcome) {
      setShowWelcome(true);
      
      // Show welcome animation for 1.5s
      setTimeout(() => {
        setShowWelcome(false);
      }, 1500);
    }
  }, [roomData, showWelcome]);

  const handleRegister = async (name: string, room: string, id: string, newRoomId: string) => {
    console.log("[Simulation] Registration successful, setting up chat...", {name, room, id, newRoomId});
    
    if (!id) {
      console.error("[Simulation] Error: Received empty guest ID during registration");
      toast({
        title: "Error en el registro",
        description: "No se pudo completar el registro. ID de invitado no válido.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    // Save user information
    setGuestName(name);
    setRoomNumber(room);
    setGuestId(id);
    setRoomId(newRoomId);
    
    // Show toast only if not shown before
    if (!hasShownRegistrationToast) {
      toast({
        title: "¡Registro exitoso!",
        description: "Ahora puede comunicarse con recepción",
        duration: 3000,
      });
      setHasShownRegistrationToast(true);
    }
    
    // Update isRegistered state immediately
    setIsRegistered(true);
  };

  const handleBackToRegistration = () => {
    setIsRegistered(false);
    setHasShownRegistrationToast(false);
  };

  // Return to QR code page
  const handleReturnToQrCode = () => {
    if (roomId) {
      window.location.href = `/qr-code/${roomId}`;
    } else {
      window.location.href = `/qr-code`;
    }
  };

  // Show loading indicator while checking registration
  if (isCheckingRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center justify-center p-6 bg-white shadow-lg rounded-lg">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-700">Verificando registro de simulación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 overflow-x-hidden relative">
      {/* Simulation banner */}
      <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white py-2 px-4 z-50 flex items-center justify-between shadow-md">
        <div className="flex items-center">
          <QrCode className="h-4 w-4 mr-2" />
          <span className="font-medium">Modo de Simulación</span>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-transparent text-white border-white hover:bg-white/20"
          onClick={handleReturnToQrCode}
        >
          <ArrowLeft className="h-3 w-3 mr-1" /> Volver
        </Button>
      </div>
      
      {/* Enhanced welcome animation with staggered elements */}
      <AnimatePresence>
        {showWelcome && roomData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-b from-hotel-700 to-hotel-500 bg-opacity-95 text-white p-6"
          >
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 15 }}
              className="bg-white rounded-full p-5 mb-4 shadow-lg"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 10, 0, -10, 0],
                  scale: [1, 1.05, 1, 1.05, 1]
                }}
                transition={{ duration: 1.5, ease: "easeInOut", times: [0, 0.2, 0.5, 0.8, 1] }}
              >
                <Hotel className="h-12 w-12 text-hotel-600" />
              </motion.div>
            </motion.div>
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 15 }}
              className="text-center"
            >
              <motion.h1
                className="text-3xl md:text-4xl font-bold mb-1"
                animate={{ scale: [0.9, 1.05, 1] }}
                transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
              >
                Cabaña {roomData.room_number}
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-2 text-sm text-white/90 font-medium"
              >
                {roomData.type && `${getRoomTypeText(roomData.type)}`}
              </motion.p>
              
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="w-16 h-1 bg-white/50 rounded-full mx-auto mt-4"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content with smooth transitions */}
      <div className="pt-14 pb-6">
        <AnimatePresence mode="wait">
          <motion.div 
            key={isRegistered ? "chat" : "registration"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {isRegistered ? (
              <div className="h-full">
                <div className="fixed bottom-16 right-4 z-30">
                  <Button 
                    onClick={handleBackToRegistration}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg"
                  >
                    Reiniciar Simulación
                  </Button>
                </div>
                <GuestChat
                  guestId={guestId}
                  roomNumber={roomNumber}
                  guestName={guestName} // Added missing guestName prop
                  simulationMode={true}
                  onBack={handleBackToRegistration}
                />
              </div>
            ) : (
              <GuestRegistrationFormWrapper 
                onRegister={handleRegister}
                preselectedRoomId={roomIdFromUrl || undefined}
                showSuccessToast={false}
                isSimulation={true} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// This is just for the typescript type
const QrCode = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="6" height="6" x="3" y="3" rx="1" />
      <rect width="6" height="6" x="15" y="3" rx="1" />
      <rect width="6" height="6" x="3" y="15" rx="1" />
      <path d="M15 15h6" />
      <path d="M18 15v6" />
    </svg>
  );
};

export default GuestSimulation;
