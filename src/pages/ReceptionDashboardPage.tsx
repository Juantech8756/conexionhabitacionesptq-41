
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReceptionDashboard from "@/components/ReceptionDashboard";
import RoomManagement from "@/components/RoomManagement";
import DashboardStats from "@/components/DashboardStats";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hotel, LogOut, MessageSquare, BarChart, Bed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const ReceptionDashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("messages");

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
      
      <div className="flex-grow overflow-hidden bg-gray-100">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="bg-white border-b">
            <div className="container mx-auto">
              <TabsList className="h-14">
                <TabsTrigger value="messages" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Mensajes</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex items-center gap-2">
                  <BarChart className="h-4 w-4" />
                  <span>Estadísticas</span>
                </TabsTrigger>
                <TabsTrigger value="rooms" className="flex items-center gap-2">
                  <Bed className="h-4 w-4" />
                  <span>Cabañas</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
          
          <div className="flex-grow overflow-hidden">
            <TabsContent value="messages" className="h-full m-0 p-0">
              <ReceptionDashboard />
            </TabsContent>
            <TabsContent value="stats" className="h-full m-0 p-0">
              <DashboardStats />
            </TabsContent>
            <TabsContent value="rooms" className="h-full m-0 p-0">
              <RoomManagement />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default ReceptionDashboardPage;
