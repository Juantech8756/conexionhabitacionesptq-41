import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Hotel, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { checkExistingRegistration } from "@/utils/registration";
import { useLocation } from "react-router-dom";

interface GuestRegistrationFormProps {
  onRegister: (guestName: string, roomNumber: string, guestId: string, roomId: string) => void;
  preselectedRoomId?: string;
  showSuccessToast?: boolean;
}

type Room = {
  id: string;
  room_number: string;
  status: string;
  floor: string | null;
  type: string | null;
};

const GuestRegistrationForm = ({ onRegister, preselectedRoomId, showSuccessToast = false }: GuestRegistrationFormProps) => {
  const [guestName, setGuestName] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [guestCount, setGuestCount] = useState("1");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [preselectedRoom, setPreselectedRoom] = useState<Room | null>(null);
  const location = useLocation();
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [isCheckingExistingGuests, setIsCheckingExistingGuests] = useState(false);
  
  // Load visitor's name from localStorage if it exists
  useEffect(() => {
    const savedName = localStorage.getItem("guestName");
    if (savedName) {
      console.log("Loaded saved guest name:", savedName);
      setGuestName(savedName);
    }
  }, []);

  // First check: Is there already a guest for this room?
  useEffect(() => {
    const checkExistingGuests = async () => {
      const queryParams = new URLSearchParams(location.search);
      const roomParam = queryParams.get('room');
      const roomIdToCheck = roomParam || preselectedRoomId;
      
      if (roomIdToCheck) {
        setIsCheckingExistingGuests(true);
        console.log("Checking if room already has guests:", roomIdToCheck);
        
        try {
          // Direct check for existing guest for this room
          const { data: existingGuest, error } = await supabase
            .from('guests')
            .select('id, name, room_number, guest_count, room_id')
            .eq('room_id', roomIdToCheck)
            .maybeSingle();
            
          if (error) {
            console.error("Error checking for existing guests:", error);
          }
          
          if (existingGuest) {
            console.log("Room already has a guest registered. Redirecting to chat:", existingGuest);
            // Save to localStorage
            localStorage.setItem('guest_id', existingGuest.id);
            localStorage.setItem('guestName', existingGuest.name);
            localStorage.setItem('roomNumber', existingGuest.room_number);
            localStorage.setItem('roomId', roomIdToCheck);
            
            // Redirect to chat by calling onRegister
            onRegister(
              existingGuest.name,
              existingGuest.room_number,
              existingGuest.id,
              roomIdToCheck
            );
            return;
          }
        } catch (error) {
          console.error("Error in existing guests check:", error);
        } finally {
          setIsCheckingExistingGuests(false);
          setInitialCheckDone(true);
        }
      } else {
        setInitialCheckDone(true);
      }
    };
    
    checkExistingGuests();
  }, [location.search, preselectedRoomId, onRegister]);

  // Check for existing registration once on component mount
  useEffect(() => {
    const handleExistingRegistration = async () => {
      if (!initialCheckDone) return; // Skip if we haven't done the initial check
      
      console.log("GuestRegistrationForm: Checking for existing registration");
      
      // Check if we're coming from a QR code scan
      const queryParams = new URLSearchParams(location.search);
      const roomParam = queryParams.get('room');
      
      // If we have a roomId from the QR or preselected, verify if we're already registered for that room
      const roomIdToCheck = roomParam || preselectedRoomId;
      
      if (roomIdToCheck) {
        console.log("QR code or preselected room ID detected:", roomIdToCheck);
        
        // First, check if ANY guest is registered for this room in the database
        const { data: roomGuest, error: roomGuestError } = await supabase
          .from('guests')
          .select('id, name, room_number, guest_count, room_id')
          .eq('room_id', roomIdToCheck)
          .maybeSingle();
          
        if (!roomGuestError && roomGuest) {
          console.log("Found existing registration for this room ID. Continuing with that guest session:", roomGuest);
          
          // Update localStorage with this guest's info
          localStorage.setItem('guest_id', roomGuest.id);
          localStorage.setItem('guestName', roomGuest.name);
          localStorage.setItem('roomNumber', roomGuest.room_number);
          localStorage.setItem('roomId', roomIdToCheck);
          
          // Continue session with this guest
          onRegister(
            roomGuest.name, 
            roomGuest.room_number, 
            roomGuest.id, 
            roomIdToCheck
          );
          return;
        }
        
        // If no guest found for this room, check if we have a guest ID in localStorage
        const existingGuest = await checkExistingRegistration(false, roomIdToCheck);
        
        if (existingGuest) {
          console.log("User is already registered for this room. Continuing session.");
          // If we're already registered for this room, continue the session
          onRegister(
            existingGuest.name, 
            existingGuest.room_number, 
            existingGuest.id, 
            existingGuest.room_id || roomIdToCheck
          );
        }
      } else {
        // If no room ID in URL, perform standard check
        console.log("No room ID in URL. Performing standard registration check.");
        const existingGuest = await checkExistingRegistration();
        
        if (existingGuest) {
          // If there's an existing registration without specific QR code, use it
          console.log("Found existing general registration. Continuing session.");
          onRegister(
            existingGuest.name, 
            existingGuest.room_number, 
            existingGuest.id, 
            existingGuest.room_id || ''
          );
        }
      }
    };
    
    handleExistingRegistration();
  }, [initialCheckDone, location.search, onRegister, preselectedRoomId]);

  // Fetch available rooms
  useEffect(() => {
    const fetchRooms = async () => {
      if (!initialCheckDone) return; // Only load rooms after checking the session
      
      console.log("Fetching available rooms and room details");
      setIsLoadingRooms(true);
      
      try {
        // Check if we're coming from a QR code scan
        const queryParams = new URLSearchParams(location.search);
        const roomParam = queryParams.get('room');
        
        // If we have a room parameter or preselectedRoomId, prioritize it
        const roomIdToSelect = roomParam || preselectedRoomId;
        
        // Fetch available rooms
        const { data: availableRooms, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('status', 'available')
          .order('room_number', { ascending: true });

        if (error) {
          console.error("Error fetching available rooms:", error);
          throw error;
        }
        
        setRooms(availableRooms || []);
        console.log(`Fetched ${availableRooms?.length || 0} available rooms`);

        // If we have a roomIdToSelect, fetch its details even if not available
        if (roomIdToSelect) {
          console.log("Fetching details for the preselected room:", roomIdToSelect);
          const { data: roomData, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomIdToSelect)
            .single();

          if (roomError) {
            console.error("Error fetching preselected room:", roomError);
          } else if (roomData) {
            console.log("Found preselected room:", roomData);
            setSelectedRoomId(roomData.id);
            setPreselectedRoom(roomData);
          }
        }
      } catch (error) {
        console.error("Error in room fetching process:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las cabañas",
          variant: "destructive",
          duration: 3000,
        });
      } finally {
        setIsLoadingRooms(false);
      }
    };

    fetchRooms();
  }, [toast, preselectedRoomId, location.search, initialCheckDone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guestName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Por favor ingrese su nombre",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    if (!selectedRoomId && !preselectedRoom) {
      toast({
        title: "Cabaña requerida",
        description: "Por favor seleccione su cabaña",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Find room number from selected room id
      const selectedRoom = preselectedRoom || rooms.find(room => room.id === selectedRoomId);
      if (!selectedRoom) {
        console.error("Room not found:", { selectedRoomId, preselectedRoom });
        throw new Error("Cabaña no encontrada");
      }
      
      const finalRoomId = selectedRoom.id;
      console.log("Registering guest for room:", { 
        roomId: finalRoomId, 
        roomNumber: selectedRoom.room_number,
        guestName,
        guestCount
      });

      // Make one final check before registration to ensure room isn't occupied by someone else
      const { data: checkRoomOccupancy, error: checkError } = await supabase
        .from('guests')
        .select('id, name')
        .eq('room_id', finalRoomId)
        .maybeSingle();
        
      if (checkError) {
        console.error("Error checking room occupancy:", checkError);
      }
      
      // If someone else registered while we were on the form
      if (checkRoomOccupancy) {
        console.log("Room was occupied by someone else while on the form:", checkRoomOccupancy);
        
        // Update localStorage with existing guest info
        localStorage.setItem('guest_id', checkRoomOccupancy.id);
        localStorage.setItem('guestName', checkRoomOccupancy.name);
        localStorage.setItem('roomNumber', selectedRoom.room_number);
        localStorage.setItem('roomId', finalRoomId);
        
        toast({
          title: "Cabaña ya ocupada",
          description: "Esta cabaña ha sido registrada por otro huésped. Continuando con ese registro.",
          duration: 4000,
        });
        
        // Continue with existing registration
        onRegister(checkRoomOccupancy.name, selectedRoom.room_number, checkRoomOccupancy.id, finalRoomId);
        return;
      }

      // Always update the room to occupied status
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', finalRoomId);
        
      if (updateError) {
        console.error("Error updating room status:", updateError);
        throw updateError;
      }

      // Insert guest into Supabase with guest count
      const { data: guest, error } = await supabase
        .from('guests')
        .insert([
          { 
            name: guestName, 
            room_number: selectedRoom.room_number, 
            room_id: finalRoomId,
            guest_count: parseInt(guestCount)
          }
        ])
        .select('id')
        .single();
      
      if (error) {
        console.error("Error creating guest record:", error);
        throw error;
      }
      
      if (!guest || !guest.id) {
        console.error("No guest ID returned after insert");
        throw new Error("Error al crear registro de invitado");
      }
      
      console.log("Guest registered successfully with ID:", guest.id);
      
      // Only show toast if explicitly requested (to avoid duplicates)
      if (showSuccessToast) {
        toast({
          title: "¡Registro exitoso!",
          description: "Ahora puede comunicarse con recepción",
          duration: 3000,
        });
      }
      
      // Store guest info in localStorage for persistence
      localStorage.setItem('guest_id', guest.id);
      localStorage.setItem('guestName', guestName);
      localStorage.setItem('roomNumber', selectedRoom.room_number);
      localStorage.setItem('roomId', finalRoomId);
      
      // Clear any previous error toasts
      onRegister(guestName, selectedRoom.room_number, guest.id, finalRoomId);
    } catch (error) {
      console.error("Error in guest registration process:", error);
      toast({
        title: "Error de registro",
        description: "No se pudo completar el registro. Por favor intente nuevamente.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get room type display name
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

  // Show loading or form based on state
  if (isCheckingExistingGuests) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gray-50 layout-fullwidth">
        <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-white shadow-md">
          <Loader2 className="h-8 w-8 animate-spin text-hotel-600 mb-2" />
          <h2 className="text-lg font-medium">Verificando registro...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full layout-fullwidth overflow-hidden bg-gray-50 px-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-full mx-auto p-0 md:p-6"
      >
        <div className="w-full bg-white shadow-md rounded-none md:rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-hotel-700 to-hotel-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Hotel className="h-8 w-8" />
                <div>
                  <h1 className="text-xl font-bold">Parque Temático Quimbaya</h1>
                  <p className="text-sm text-white/80">Registro de huésped</p>
                </div>
              </div>
              {preselectedRoom && (
                <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  Cabaña {preselectedRoom.room_number}
                </div>
              )}
            </div>
          </div>
          
          {/* Form content */}
          <div className="p-6">
            {preselectedRoom && preselectedRoom.status !== 'available' && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
                <p className="font-medium">Esta cabaña está marcada como {preselectedRoom.status === 'occupied' ? 'ocupada' : preselectedRoom.status}.</p>
                <p className="text-sm mt-1">Podría haber un error. Si la cabaña debería estar disponible, contacte a recepción.</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6 w-full">
              <div className="space-y-4 w-full">
                <div>
                  <Label htmlFor="guestName">Nombre completo</Label>
                  <Input
                    id="guestName"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Ingrese su nombre completo"
                    required
                    className="mt-1 w-full"
                  />
                </div>
                
                <div>
                  <Label htmlFor="guestCount">Número de huéspedes</Label>
                  <div className="select-container">
                    <Select
                      value={guestCount}
                      onValueChange={setGuestCount}
                    >
                      <SelectTrigger id="guestCount" className="w-full mt-1">
                        <SelectValue placeholder="Seleccione cantidad de huéspedes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 huésped</SelectItem>
                        <SelectItem value="2">2 huéspedes</SelectItem>
                        <SelectItem value="3">3 huéspedes</SelectItem>
                        <SelectItem value="4">4 huéspedes</SelectItem>
                        <SelectItem value="5">5 huéspedes</SelectItem>
                        <SelectItem value="6">6+ huéspedes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {!preselectedRoom && (
                  <div>
                    <Label htmlFor="roomNumber">Cabaña</Label>
                    <div className="select-container">
                      <Select
                        value={selectedRoomId}
                        onValueChange={setSelectedRoomId}
                        disabled={isLoadingRooms}
                      >
                        <SelectTrigger id="roomNumber" className="w-full mt-1">
                          <SelectValue placeholder={isLoadingRooms ? "Cargando cabañas..." : "Seleccione una cabaña"} />
                        </SelectTrigger>
                        <SelectContent>
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              Cabaña {room.room_number} 
                              {room.type && ` - ${getRoomTypeText(room.type)}`}
                            </SelectItem>
                          ))}
                          {rooms.length === 0 && !isLoadingRooms && (
                            <SelectItem value="none" disabled>
                              No hay cabañas disponibles
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              
              <motion.div
                className="mt-4"
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
              >
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-hotel-600 to-hotel-500 hover:from-hotel-700 hover:to-hotel-600 text-white rounded-lg font-medium shadow-md"
                  disabled={isLoading || isLoadingRooms || (!selectedRoomId && !preselectedRoom)}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Procesando...
                    </span>
                  ) : (
                    "Continuar"
                  )}
                </Button>
              </motion.div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default GuestRegistrationForm;
