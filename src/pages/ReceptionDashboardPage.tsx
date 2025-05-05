
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReceptionDashboard from "@/components/ReceptionDashboard";
import { Button } from "@/components/ui/button";
import { Hotel, LogOut } from "lucide-react";

const ReceptionDashboardPage = () => {
  const navigate = useNavigate();

  // Comprobar autenticación
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("receptionAuth") === "true";
    if (!isAuthenticated) {
      navigate("/reception");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("receptionAuth");
    navigate("/reception");
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-hotel-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Hotel className="h-6 w-6 mr-2" />
            <h1 className="text-xl font-bold">Dashboard de Recepción</h1>
          </div>
          <Button 
            variant="ghost" 
            className="text-white hover:bg-hotel-700" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </header>
      
      <div className="flex-grow">
        <ReceptionDashboard />
      </div>
    </div>
  );
};

export default ReceptionDashboardPage;
