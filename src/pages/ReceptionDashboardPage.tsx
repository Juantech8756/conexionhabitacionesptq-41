
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
import { motion } from "framer-motion";

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
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="flex flex-col items-center"
        >
          <div className="w-16 h-16 mb-4 rounded-full border-4 border-hotel-600 border-t-transparent animate-spin" />
          <p className="text-hotel-700 font-medium">Cargando...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-gradient-to-r from-hotel-700 to-hotel-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Hotel className="h-6 w-6 mr-2" />
            <h1 className="text-xl font-bold">Dashboard de Recepción</h1>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <motion.span 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="text-sm bg-white/10 px-3 py-1 rounded-full"
              >
                {user.email}
              </motion.span>
            )}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/20 transition-colors" 
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </Button>
            </motion.div>
          </div>
        </div>
      </header>
      
      <div className="flex-grow overflow-hidden bg-gray-100">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="bg-white border-b shadow-sm">
            <div className="container mx-auto">
              <TabsList className="h-14">
                <TabsTrigger value="messages" className="flex items-center gap-2 relative transition-all duration-300">
                  <MessageSquare className="h-4 w-4" />
                  <span>Mensajes</span>
                  {activeTab === "messages" && (
                    <motion.div 
                      layoutId="active-tab-indicator"
                      className="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-hotel-600"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex items-center gap-2 relative transition-all duration-300">
                  <BarChart className="h-4 w-4" />
                  <span>Estadísticas</span>
                  {activeTab === "stats" && (
                    <motion.div 
                      layoutId="active-tab-indicator"
                      className="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-hotel-600"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="rooms" className="flex items-center gap-2 relative transition-all duration-300">
                  <Bed className="h-4 w-4" />
                  <span>Cabañas</span>
                  {activeTab === "rooms" && (
                    <motion.div 
                      layoutId="active-tab-indicator"
                      className="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-hotel-600"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
          
          <div className="flex-grow overflow-hidden">
            <TabsContent value="messages" className="h-full m-0 p-0 data-[state=active]:fade-in">
              <ReceptionDashboard />
            </TabsContent>
            <TabsContent value="stats" className="h-full m-0 p-0 data-[state=active]:fade-in">
              <DashboardStats />
            </TabsContent>
            <TabsContent value="rooms" className="h-full m-0 p-0 data-[state=active]:fade-in">
              <RoomManagement />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default ReceptionDashboardPage;
