import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
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

interface GuestRegistrationFormProps {
  onRegister: (guestName: string, roomNumber: string, guestId: string) => void;
  preselectedRoomId?: string;
}

type Room = {
  id: string;
  room_number: string;
  status: string;
  floor: string | null;
  type: string | null;
};

const GuestRegistrationForm = ({ onRegister, preselectedRoomId }: GuestRegistrationFormProps) => {
  const [guestName, setGuestName] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [guestCount, setGuestCount] = useState("1");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [preselectedRoom, setPreselectedRoom] = useState<Room | null>(null);

  // Fetch available rooms
  useEffect(() => {
    const fetchRooms = async () => {
      setIsLoadingRooms(true);
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('status', 'available')
          .order('room_number', { ascending: true });

        if (error) throw error;
        setRooms(data || []);

        // If we have a preselectedRoomId, try to find it
        if (preselectedRoomId) {
          // Also fetch the specific room if it's not in the available rooms
          const { data: roomData, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', preselectedRoomId)
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
        });
      } finally {
        setIsLoadingRooms(false);
      }
    };

    fetchRooms();
  }, [toast, preselectedRoomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guestName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Por favor ingrese su nombre",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedRoomId) {
      toast({
        title: "Cabaña requerida",
        description: "Por favor seleccione su cabaña",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Find room number from selected room id
      const selectedRoom = preselectedRoom || rooms.find(room => room.id === selectedRoomId);
      if (!selectedRoom) throw new Error("Cabaña no encontrada");

      // Update the selected room to occupied status
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', selectedRoomId);
        
      if (updateError) throw updateError;

      // Insert guest into Supabase
      const { data: guest, error } = await supabase
        .from('guests')
        .insert([
          { 
            name: guestName, 
            room_number: selectedRoom.room_number, 
            room_id: selectedRoomId,
            guest_count: parseInt(guestCount)
          }
        ])
        .select('id')
        .single();
      
      if (error) throw error;
      
      onRegister(guestName, selectedRoom.room_number, guest.id);
      
      toast({
        title: "¡Registro exitoso!",
        description: "Ahora puede comunicarse con recepción",
      });
    } catch (error) {
      console.error("Error registering guest:", error);
      toast({
        title: "Error de registro",
        description: "No se pudo completar el registro. Por favor intente nuevamente.",
        variant: "destructive",
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
            className="bg-hotel-50 p-3 rounded-full mb-4"
          >
            <Hotel className="h-10 w-10 text-hotel-600" />
          </motion.div>
          <h1 className="text-2xl font-bold text-center text-gray-800">
            Bienvenido al Parque Temático Quimbaya
          </h1>
          
          {preselectedRoom && (
            <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-gray-700">
              <p className="font-medium text-center">Está registrándose en la cabaña: 
                <span className="font-bold text-green-700 ml-1">
                  {preselectedRoom.room_number}
                  {preselectedRoom.type && ` - ${getRoomTypeText(preselectedRoom.type)}`}
                </span>
              </p>
            </div>
          )}
          
          <p className="text-gray-600 text-center mt-2">
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
              className="w-full h-12 rounded-lg focus:ring-hotel-500 focus:border-hotel-500 shadow-sm"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="roomNumber" className="text-gray-700">Seleccione su cabaña</Label>
            {isLoadingRooms ? (
              <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin mr-2 text-hotel-600" />
                <span className="text-sm text-gray-600">Cargando cabañas...</span>
              </div>
            ) : rooms.length === 0 && !preselectedRoom ? (
              <div className="text-center p-4 text-sm text-red-500 bg-red-50 rounded-lg">
                No hay cabañas disponibles
              </div>
            ) : (
              <Select 
                value={selectedRoomId} 
                onValueChange={setSelectedRoomId}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full h-12 rounded-lg focus:ring-hotel-500 focus:border-hotel-500 shadow-sm">
                  <SelectValue placeholder="Seleccione su cabaña" />
                </SelectTrigger>
                <SelectContent className="max-h-[50vh]">
                  {preselectedRoom && (
                    <SelectItem key={preselectedRoom.id} value={preselectedRoom.id} className="font-medium">
                      {preselectedRoom.room_number} 
                      {preselectedRoom.type && ` - ${getRoomTypeText(preselectedRoom.type)}`}
                      {preselectedRoom.status !== 'available' && " (Ocupada)"}
                    </SelectItem>
                  )}
                  {rooms
                    .filter(room => room.id !== preselectedRoom?.id)
                    .map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.room_number} 
                        {room.type && ` - ${getRoomTypeText(room.type)}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {selectedRoomId && (
            <div className="space-y-2">
              <Label htmlFor="guestCount" className="text-gray-700">¿Cuántos hospedados hay en la cabaña?</Label>
              <Select 
                value={guestCount} 
                onValueChange={setGuestCount}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full h-12 rounded-lg focus:ring-hotel-500 focus:border-hotel-500 shadow-sm">
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
      </motion.div>
    </div>
  );
};

export default GuestRegistrationForm;
