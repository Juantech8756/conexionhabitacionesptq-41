
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Hotel } from "lucide-react";

interface GuestRegistrationFormProps {
  onRegister: (guestName: string, roomNumber: string) => void;
}

const GuestRegistrationForm = ({ onRegister }: GuestRegistrationFormProps) => {
  const [guestName, setGuestName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guestName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Por favor ingrese su nombre",
        variant: "destructive",
      });
      return;
    }
    
    if (!roomNumber.trim()) {
      toast({
        title: "Número de habitación requerido",
        description: "Por favor ingrese su número de habitación",
        variant: "destructive",
      });
      return;
    }
    
    onRegister(guestName, roomNumber);
    
    toast({
      title: "¡Registro exitoso!",
      description: "Ahora puede comunicarse con recepción",
    });
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
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="roomNumber">Número de Habitación</Label>
          <Input
            id="roomNumber"
            placeholder="Ej: 101"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            className="w-full"
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-hotel-600 hover:bg-hotel-700 transition-all"
        >
          Continuar
        </Button>
      </form>
    </div>
  );
};

export default GuestRegistrationForm;
