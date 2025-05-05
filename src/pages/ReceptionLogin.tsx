
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Hotel } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ReceptionLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Query the reception_users table to check credentials
      const { data, error } = await supabase
        .from('reception_users')
        .select('id, username')
        .eq('username', username)
        .single();
      
      if (error || !data) {
        throw new Error('Credenciales incorrectas');
      }
      
      // For simplicity, we're using the hardcoded admin/admin123 credentials
      // In a real-world app, we would use proper password hashing and verification
      if (username === 'admin' && password === 'admin123') {
        // Login successful
        toast({
          title: "Acceso correcto",
          description: "Redirigiendo al dashboard..."
        });
        
        // Store auth state
        localStorage.setItem("receptionAuth", "true");
        localStorage.setItem("receptionUserId", data.id);
        
        // Redirect to dashboard
        navigate("/reception/dashboard");
      } else {
        throw new Error('Credenciales incorrectas');
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error de autenticación",
        description: "Credenciales incorrectas. Por favor, inténtelo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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
              disabled={isLoading}
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
              disabled={isLoading}
              required
            />
          </div>
          
          <Button
            type="submit"
            className="w-full bg-hotel-600 hover:bg-hotel-700"
            disabled={isLoading}
          >
            {isLoading ? "Procesando..." : "Iniciar Sesión"}
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
