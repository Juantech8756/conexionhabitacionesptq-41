
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Hotel, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GuestRegistrationFormProps {
  onRegister: (guestName: string, roomNumber: string, guestId: string) => void;
}

type Room = {
  id: string;
  room_number: string;
  status: string;
  floor: string | null;
  type: string | null;
};

const GuestRegistrationForm = ({ onRegister }: GuestRegistrationFormProps) => {
  const [guestName, setGuestName] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const { toast } = useToast();

  // Fetch available rooms
  useEffect(() => {
    const fetchRooms = async () => {
      setIsLoadingRooms(true);
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('status', 'available') // Changed from 'occupied' to 'available'
          .order('room_number', { ascending: true });

        if (error) throw error;
        setRooms(data || []);
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
  }, [toast]);

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
      const selectedRoom = rooms.find(room => room.id === selectedRoomId);
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
            room_id: selectedRoomId 
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

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6">
      <div className="flex items-center justify-center mb-8">
        <Hotel className="h-8 w-8 text-hotel-600 mr-2" />
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Bienvenido al Hotel
        </h1>
      </div>
      
      <div className="text-center mb-8">
        <p className="text-gray-600">
          Para comunicarse con recepción, por favor ingrese sus datos
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="guestName">Nombre</Label>
          <Input
            id="guestName"
            placeholder="Ingrese su nombre completo"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full"
            disabled={isLoading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="roomNumber">Cabaña</Label>
          {isLoadingRooms ? (
            <div className="flex items-center justify-center p-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">Cargando cabañas...</span>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center p-2 text-sm text-red-500">
              No hay cabañas disponibles
            </div>
          ) : (
            <Select 
              value={selectedRoomId} 
              onValueChange={setSelectedRoomId}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione su cabaña" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.room_number} 
                    {room.type && ` - ${room.type === 'family' ? 'Familiar' : 'Pareja'}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-hotel-600 hover:bg-hotel-700 transition-all"
          disabled={isLoading || isLoadingRooms}
        >
          {isLoading ? "Procesando..." : "Continuar"}
        </Button>
      </form>
    </div>
  );
};

export default GuestRegistrationForm;
