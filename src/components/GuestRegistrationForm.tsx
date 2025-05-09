import { useState, useEffect, useRef } from "react";
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
  
  // Cargamos el nombre del visitante de localStorage si existe
  useEffect(() => {
    const savedName = localStorage.getItem("guestName");
    if (savedName) {
      setGuestName(savedName);
    }
  }, []);

  // Check for existing registration once on component mount
  useEffect(() => {
    const handleExistingRegistration = async () => {
      // Check if we're coming from a QR code scan
      const queryParams = new URLSearchParams(location.search);
      const roomParam = queryParams.get('room');
      
      // Si tenemos un roomId del QR o preseleccionado, verificamos si ya estamos registrados para ese room
      const roomIdToCheck = roomParam || preselectedRoomId;
      
      if (roomIdToCheck) {
        const existingGuest = await checkExistingRegistration(false, roomIdToCheck);
        
        if (existingGuest) {
          // Si ya estamos registrados para esta habitación, simplemente continuamos la sesión
          console.log("Continuing existing session for room", roomIdToCheck);
          onRegister(
            existingGuest.name, 
            existingGuest.room_number, 
            existingGuest.id, 
            existingGuest.room_id || roomIdToCheck
          );
        } else {
          // Si no estamos registrados para esta habitación específica,
          // mostramos el formulario con la habitación preseleccionada
          console.log("No existing registration for this room found, showing form with preselected room");
          setInitialCheckDone(true);
        }
      } else {
        // Si no hay roomId en la URL, hacemos la verificación estándar
        const existingGuest = await checkExistingRegistration();
        
        if (existingGuest) {
          // Si tenemos un registro existente sin QR code específico, lo usamos
          console.log("Found existing registration without QR code, continuing session");
          onRegister(
            existingGuest.name, 
            existingGuest.room_number, 
            existingGuest.id, 
            existingGuest.room_id || ''
          );
        } else {
          setInitialCheckDone(true);
        }
      }
    };
    
    handleExistingRegistration();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch available rooms
  useEffect(() => {
    const fetchRooms = async () => {
      if (!initialCheckDone) return; // Solo cargamos habitaciones después de verificar la sesión
      
      setIsLoadingRooms(true);
      try {
        // Check if we're coming from a QR code scan
        const queryParams = new URLSearchParams(location.search);
        const roomParam = queryParams.get('room');
        
        // If we have a room parameter or preselectedRoomId, prioritize it
        const roomIdToSelect = roomParam || preselectedRoomId;
        
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('status', 'available')
          .order('room_number', { ascending: true });

        if (error) throw error;
        setRooms(data || []);

        // If we have a roomIdToSelect, try to find it
        if (roomIdToSelect) {
          // Also fetch the specific room if it's not in the available rooms
          const { data: roomData, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomIdToSelect)
            .single();

          if (!roomError && roomData) {
            setSelectedRoomId(roomData.id);
            setPreselectedRoom(roomData);
            
            // If the room isn't available, show a message
            if (roomData.status !== 'available') {
              toast({
                title: "Atención",
                description: `La cabaña ${roomData.room_number} está marcada como ${roomData.status === 'occupied' ? 'ocupada' : roomData.status}. Por favor seleccione otra cabaña si es necesario.`,
                variant: "default",
                duration: 5000,
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching rooms:", error);
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
      if (!selectedRoom) throw new Error("Cabaña no encontrada");
      
      const finalRoomId = selectedRoom.id;

      // Update the selected room to occupied status
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', finalRoomId);
        
      if (updateError) throw updateError;

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
      
      if (error) throw error;
      
      // Solo mostrar toast si se solicita explícitamente (para evitar duplicados)
      if (showSuccessToast) {
        toast({
          title: "¡Registro exitoso!",
          description: "Ahora puede comunicarse con recepción",
          duration: 3000,
        });
      }
      
      // Store the guest ID and room ID in localStorage for persistence
      if (guest && guest.id) {
        localStorage.setItem('guest_id', guest.id);
        localStorage.setItem('guestName', guestName);
        localStorage.setItem('roomNumber', selectedRoom.room_number);
        localStorage.setItem('roomId', finalRoomId);
      }
      
      // Limpiar cualquier toast previo de error que pudiera estar visible
      onRegister(guestName, selectedRoom.room_number, guest.id, finalRoomId);
    } catch (error) {
      console.error("Error registering guest:", error);
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

  if (!initialCheckDone) {
    // Mostramos un indicador de carga mientras verificamos la sesión
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600">Verificando si ya has registrado tu cabaña...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`w-full ${isMobile ? "max-w-[95%]" : "max-w-md"} bg-white rounded-xl shadow-lg p-6 space-y-4`}
      >
        <div className="flex flex-col items-center justify-center mb-4">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="bg-blue-50 p-3 rounded-full mb-4"
          >
            <Hotel className="h-10 w-10 text-blue-600" />
          </motion.div>
          <h1 className="text-2xl font-bold text-center text-gray-800">
            Bienvenido al Parque Temático Quimbaya
          </h1>
          
          {preselectedRoom && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-5 p-4 bg-blue-50 border border-blue-100 rounded-lg w-full text-center"
            >
              <h2 className="text-xl font-bold text-blue-600">Cabaña {preselectedRoom.room_number}</h2>
              {preselectedRoom.type && (
                <p className="text-lg text-blue-700">{getRoomTypeText(preselectedRoom.type)}</p>
              )}
            </motion.div>
          )}
          
          <p className="text-gray-600 text-center mt-4">
            Para comunicarse con recepción, por favor ingrese sus datos
          </p>
          <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
            <p>Si necesita cualquier servicio para su cabaña, tiene alguna consulta o requiere asistencia, 
            puede escribirnos directamente usando nuestro sistema de chat.</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guestName" className="text-gray-700">Nombre completo</Label>
            <Input
              id="guestName"
              placeholder="Ingrese su nombre completo"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full h-12 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              disabled={isLoading}
            />
          </div>
          
          {/* Solo mostrar la selección de cabaña si no hay una preseleccionada */}
          {!preselectedRoom && (
            <div className="space-y-2">
              <Label htmlFor="roomNumber" className="text-gray-700">Seleccione su cabaña</Label>
              {isLoadingRooms ? (
                <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg">
                  <Loader2 className="h-5 w-5 animate-spin mr-2 text-blue-600" />
                  <span className="text-sm text-gray-600">Cargando cabañas...</span>
                </div>
              ) : rooms.length === 0 ? (
                <div className="text-center p-4 text-sm text-red-500 bg-red-50 rounded-lg">
                  No hay cabañas disponibles
                </div>
              ) : (
                <Select 
                  value={selectedRoomId} 
                  onValueChange={setSelectedRoomId}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full h-12 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm">
                    <SelectValue placeholder="Seleccione su cabaña" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[50vh]">
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.room_number} 
                        {room.type && ` - ${getRoomTypeText(room.type)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          
          {(selectedRoomId || preselectedRoom) && (
            <div className="space-y-2">
              <Label htmlFor="guestCount" className="text-gray-700">¿Cuántos hospedados hay en la cabaña?</Label>
              <Select 
                value={guestCount} 
                onValueChange={setGuestCount}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full h-12 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm">
                  <SelectValue placeholder="Seleccione cantidad de hospedados" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'Persona' : 'Personas'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <motion.div
            className="mt-4"
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: isLoading ? 1 : 0.98 }}
          >
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg font-medium shadow-md"
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
      </motion.div>
    </div>
  );
};

export default GuestRegistrationForm;
