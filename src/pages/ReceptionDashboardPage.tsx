
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReceptionDashboard from "@/components/ReceptionDashboard";
import { Button } from "@/components/ui/button";
import { Hotel, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const ReceptionDashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Comprobar autenticación con Supabase Auth
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        
        if (!session) {
          navigate("/reception");
        }
      } catch (error) {
        console.error("Error getting session:", error);
        navigate("/reception");
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (event === "SIGNED_OUT") {
        navigate("/reception");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/reception");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-hotel-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Hotel className="h-6 w-6 mr-2" />
            <h1 className="text-xl font-bold">Dashboard de Recepción</h1>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <span className="text-sm opacity-90">
                {user.email}
              </span>
            )}
            <Button 
              variant="ghost" 
              className="text-white hover:bg-hotel-700" 
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>
      
      <div className="flex-grow">
        <ReceptionDashboard />
      </div>
    </div>
  );
};

export default ReceptionDashboardPage;
