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
  const [isLoading, setIsLoading] = useState(false); // Add the missing isLoading state
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const roomIdFromUrl = searchParams.get('room');
  
  // States for welcome animation
  const [showWelcome, setShowWelcome] = useState(false);
  const [roomData, setRoomData] = useState<{room_number: string, type: string | null, status: string | null} | null>(null);
  // Flag to prevent duplicate toasts
  const [hasShownRegistrationToast, setHasShownRegistrationToast] = useState(false);
  // State to track if we're checking registration
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);

  // Check if the user has registered previously and load their chat
  useEffect(() => {
    const checkRegistration = async () => {
      console.log("Checking registration status with roomIdFromUrl:", roomIdFromUrl);
      setIsCheckingRegistration(true);
      
      try {
        // Use the updated checkExistingRegistration that handles cross-device access better
        const existingGuest = await checkExistingRegistration(false, roomIdFromUrl || undefined);
        
        if (existingGuest) {
          console.log("Found existing guest registration:", existingGuest);
          setGuestName(existingGuest.name);
          setRoomNumber(existingGuest.room_number);
          setGuestId(existingGuest.id);
          setRoomId(existingGuest.room_id || '');
          setIsRegistered(true);
          
          // Show toast for returning users only once
          if (!hasShownRegistrationToast) {
            toast({
              title: "Sesión recuperada",
              description: `Bienvenido a la cabaña ${existingGuest.room_number}`,
              duration: 3000,
            });
            setHasShownRegistrationToast(true);
          }
        } else if (roomIdFromUrl) {
          // Specifically for QR scan with no existing registration
          console.log("QR code scan detected, but no existing registration found. Showing registration form.");
          setIsRegistered(false);
          
          // Pre-check room status
          const { data: room } = await supabase
            .from('rooms')
            .select('status')
            .eq('id', roomIdFromUrl)
            .single();
            
          if (room && room.status === 'occupied') {
            // Double-check if there are any guests for this room
            // This is a fallback in case our main check missed something
            const { data: roomGuest } = await supabase
              .from('guests')
              .select('id, name, room_number, guest_count, room_id')
              .eq('room_id', roomIdFromUrl)
              .maybeSingle();
              
            if (roomGuest) {
              // Found a guest for this room, set up the session
              console.log("Found guest for occupied room on secondary check:", roomGuest);
              setGuestName(roomGuest.name);
              setRoomNumber(roomGuest.room_number);
              setGuestId(roomGuest.id);
              setRoomId(roomIdFromUrl);
              setIsRegistered(true);
              
              // Save in localStorage
              localStorage.setItem('guest_id', roomGuest.id);
              localStorage.setItem('guestName', roomGuest.name);
              localStorage.setItem('roomNumber', roomGuest.room_number);
              localStorage.setItem('roomId', roomIdFromUrl);
              
              if (!hasShownRegistrationToast) {
                toast({
                  title: "Sesión recuperada",
                  description: `Bienvenido a la cabaña ${roomGuest.room_number}`,
                  duration: 3000,
                });
                setHasShownRegistrationToast(true);
              }
              return;
            }
            
            // Room is marked as occupied but has no guest - this is an inconsistency
            // We'll allow registration but show a notification
            console.log("Room marked as occupied but has no guest registration. Will allow registration.");
            toast({
              title: "Cabaña disponible",
              description: "Aunque la cabaña aparece como ocupada, puede registrarse ahora.",
              duration: 5000,
            });
          }
        } else {
          console.log("No existing registration found or new room requested via QR, showing form");
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
  }, [roomIdFromUrl, toast, hasShownRegistrationToast]);

  // Get room information if roomIdFromUrl is provided
  useEffect(() => {
    const fetchRoomData = async () => {
      if (!roomIdFromUrl) return;
      
      setIsLoading(true); // Now this will work since we've added the state
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
          setShowWelcome(true);
          
          // Show welcome animation for 1.5s
          setTimeout(() => {
            setShowWelcome(false);
          }, 1500);
        }
      } catch (error) {
        console.error("Error in room data fetch:", error);
      } finally {
        setIsLoading(false); // Now this will work since we've added the state
      }
    };

    fetchRoomData();
  }, [roomIdFromUrl]);

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
    
    // Clear any session storage markers for alerts
    if (roomData) {
      const alertKey = `cabin-alert-Cabaña no disponible-La cabaña ${roomData.room_number} está ocupada.`;
      sessionStorage.removeItem(alertKey);
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
