import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import GuestRegistrationForm from "@/components/GuestRegistrationForm";
import GuestChat from "@/components/GuestChat";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Hotel } from "lucide-react";
import { showGlobalAlert } from "@/hooks/use-alerts";
import { checkExistingRegistration } from "@/utils/registration";

const GuestPortal = () => {
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
      console.log("Checking registration status with roomIdFromUrl:", roomIdFromUrl);
      setIsCheckingRegistration(true);
      
      try {
        // Specifically check for QR scanned room regardless of localStorage state
        if (roomIdFromUrl) {
          console.log("QR code scan detected, checking if the room already has a registration");
          
          // First, directly check if this room has any guest record
          const { data: existingRoomGuest, error } = await supabase
            .from('guests')
            .select('id, name, room_number, guest_count, room_id')
            .eq('room_id', roomIdFromUrl)
            .maybeSingle();
            
          if (error) {
            console.error("Error checking for existing room guests:", error);
          }
          
          // If a guest record exists for this room from any device, use that
          if (existingRoomGuest) {
            console.log("Found existing registration for this room:", existingRoomGuest);
            
            // Save to localStorage for future visits
            localStorage.setItem('guest_id', existingRoomGuest.id);
            localStorage.setItem('guestName', existingRoomGuest.name);
            localStorage.setItem('roomNumber', existingRoomGuest.room_number);
            localStorage.setItem('roomId', roomIdFromUrl);
            
            // Set up the chat
            setGuestName(existingRoomGuest.name);
            setRoomNumber(existingRoomGuest.room_number);
            setGuestId(existingRoomGuest.id);
            setRoomId(roomIdFromUrl);
            setIsRegistered(true);
            
            // REMOVED: Eliminated toast notification for returning users
          }
          
          // If no direct guest record, check room status
          const { data: room } = await supabase
            .from('rooms')
            .select('status, room_number')
            .eq('id', roomIdFromUrl)
            .maybeSingle();
            
          if (room && room.status === 'occupied') {
            console.log("Room is marked as occupied but no guest found. This is inconsistent.");
            // IMPORTANT: REMOVED toast notification for occupied cabins
            // The alerts are now completely suppressed in the use-alerts.tsx hook
          }
        }
        
        // Use the updated checkExistingRegistration as fallback
        const existingGuest = await checkExistingRegistration(false, roomIdFromUrl || undefined);
        
        if (existingGuest) {
          console.log("Found existing guest registration:", existingGuest);
          setGuestName(existingGuest.name);
          setRoomNumber(existingGuest.room_number);
          setGuestId(existingGuest.id);
          setRoomId(existingGuest.room_id || '');
          setIsRegistered(true);
          
          // REMOVED: Eliminated toast notification for returning users
        } else {
          console.log("No existing registration found, showing form");
          setIsRegistered(false);
        }
      } catch (error) {
        console.error("Error during registration check:", error);
        setIsRegistered(false);
      } finally {
        setIsCheckingRegistration(false);
      }
    };
    
    checkRegistration();
  }, [roomIdFromUrl, toast]);

  // Get room information if roomIdFromUrl is provided
  useEffect(() => {
    const fetchRoomData = async () => {
      if (!roomIdFromUrl) return;
      
      setIsLoading(true);
      try {
        console.log("Fetching room data for room ID:", roomIdFromUrl);
        const { data, error } = await supabase
          .from('rooms')
          .select('room_number, type, status')
          .eq('id', roomIdFromUrl)
          .single();
        
        if (error) {
          console.error("Error fetching room data:", error);
          throw error;
        }
        
        if (data) {
          console.log("Room data fetched:", data);
          setRoomData(data);
          
          // MODIFIED: Only show welcome animation if:
          // 1. Not already registered for this room AND
          // 2. We don't have a session marked in sessionStorage
          const animationShownKey = `animation-shown-${roomIdFromUrl}`;
          if (!isRegistered && !sessionStorage.getItem(animationShownKey)) {
            setShowWelcome(true);
            
            // Show welcome animation for 1.5s
            setTimeout(() => {
              setShowWelcome(false);
            }, 1500);
            
            // Mark that we've shown the animation for this room
            sessionStorage.setItem(animationShownKey, 'true');
          }
        }
      } catch (error) {
        console.error("Error in room data fetch:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomData();
  }, [roomIdFromUrl, isRegistered]);

  const handleRegister = async (name: string, room: string, id: string, newRoomId: string) => {
    console.log("Registration successful, setting up chat...", {name, room, id, newRoomId});
    
    if (!id) {
      console.error("Error: Received empty guest ID during registration");
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
    
    // Save in localStorage for future visits - USING CONSISTENT KEYS
    localStorage.setItem("guest_id", id);
    localStorage.setItem("guestName", name);
    localStorage.setItem("roomNumber", room);
    localStorage.setItem("roomId", newRoomId);
    
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
    // For testing, allow returning to the form
    setIsRegistered(false);
    localStorage.removeItem("guest_id");
    localStorage.removeItem("guestName");
    localStorage.removeItem("roomNumber");
    localStorage.removeItem("roomId");
    setHasShownRegistrationToast(false);
    
    // Clear any session storage markers for alerts AND animations
    if (roomData) {
      const alertKey = `cabin-alert-Cabaña no disponible-La cabaña ${roomData.room_number} está ocupada.`;
      sessionStorage.removeItem(alertKey);
      
      // Also remove animation markers
      if (roomId) {
        sessionStorage.removeItem(`animation-shown-${roomId}`);
      }
      
      // Clear any other cabin alert keys
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('cabin-alert-') || key.startsWith('animation-shown-')) {
          sessionStorage.removeItem(key);
        }
      });
    }
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

  // Show loading indicator while checking registration
  if (isCheckingRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center justify-center p-6 bg-white shadow-lg rounded-lg">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-700">Verificando su registro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 overflow-x-hidden">
      {/* Enhanced welcome animation with staggered elements */}
      <AnimatePresence>
        {showWelcome && roomData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-hotel-700 to-hotel-500 bg-opacity-95 text-white p-6"
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default GuestPortal;
