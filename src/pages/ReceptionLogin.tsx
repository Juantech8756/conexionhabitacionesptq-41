
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Hotel } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ReceptionLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Demo: Credenciales hardcodeadas para propósitos de demostración
    // En una aplicación real, esto sería autenticado contra un backend
    if (username === "admin" && password === "admin123") {
      // Login exitoso
      toast({
        title: "Acceso correcto",
        description: "Redirigiendo al dashboard..."
      });
      
      // En una aplicación real, aquí almacenaríamos un token de sesión
      localStorage.setItem("receptionAuth", "true");
      
      // Redirigir al dashboard
      navigate("/reception/dashboard");
    } else {
      toast({
        title: "Error de autenticación",
        description: "Credenciales incorrectas. Por favor, inténtelo de nuevo.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
        <div className="flex items-center justify-center mb-8">
          <Hotel className="h-10 w-10 text-hotel-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-800">
            Portal de Recepción
          </h1>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Usuario</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingrese su nombre de usuario"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
              required
            />
          </div>
          
          <Button
            type="submit"
            className="w-full bg-hotel-600 hover:bg-hotel-700"
          >
            Iniciar Sesión
          </Button>
        </form>
        
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Para demo: usuario: admin, contraseña: admin123</p>
        </div>
      </div>
    </div>
  );
};

export default ReceptionLogin;
