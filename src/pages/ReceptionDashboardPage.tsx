import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReceptionDashboard from "@/components/ReceptionDashboard";
import RoomManagement from "@/components/RoomManagement";
import DashboardStats from "@/components/DashboardStats";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hotel, LogOut, MessageSquare, BarChart, Bed, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import CallInterface from "@/components/CallInterface";

const ReceptionDashboardPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("messages");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<{
    id: string;
    name: string;
    roomNumber: string;
  } | null>(null);
  
  const isMobile = useIsMobile();

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
        toast({
          title: "Error de sesión",
          description: "No se pudo verificar tu sesión. Por favor, inicia sesión nuevamente.",
          variant: "destructive",
        });
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
  }, [navigate, toast]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/reception");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "No se pudo cerrar sesión. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleStartCall = (guest: { id: string; name: string; roomNumber: string }) => {
    setSelectedGuest(guest);
    setIsCallActive(true);
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    setSelectedGuest(null);
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
      <header className="gradient-header p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            {isMobile && (
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="mr-2 text-white hover:bg-white/20">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Menú</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[85vw] max-w-[300px]">
                  <div className="bg-hotel-700 text-white p-4 flex items-center gap-2">
                    <Hotel className="h-5 w-5" />
                    <h2 className="text-lg font-medium">Parque Temático Quimbaya</h2>
                  </div>
                  <nav className="p-4">
                    <ul className="space-y-2">
                      <li>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-gray-700"
                          onClick={() => {
                            setActiveTab("messages");
                            setSidebarOpen(false);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Mensajes
                        </Button>
                      </li>
                      <li>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-gray-700"
                          onClick={() => {
                            setActiveTab("stats");
                            setSidebarOpen(false);
                          }}
                        >
                          <BarChart className="h-4 w-4 mr-2" />
                          Estadísticas
                        </Button>
                      </li>
                      <li>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-gray-700"
                          onClick={() => {
                            setActiveTab("rooms");
                            setSidebarOpen(false);
                          }}
                        >
                          <Bed className="h-4 w-4 mr-2" />
                          Cabañas
                        </Button>
                      </li>
                    </ul>
                  </nav>
                </SheetContent>
              </Sheet>
            )}
            <Hotel className="h-6 w-6 mr-2" />
            <h1 className={`font-bold ${isMobile ? "text-lg" : "text-xl"}`}>Dashboard de Recepción</h1>
          </div>
          <div className="flex items-center space-x-2">
            {user && !isMobile && (
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
                size={isMobile ? "sm" : "default"}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isMobile ? "" : "Cerrar sesión"}
              </Button>
            </motion.div>
          </div>
        </div>
      </header>
      
      <div className="flex-grow overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {!isMobile && (
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
          )}
          
          <div className="flex-grow overflow-auto">
            <TabsContent value="messages" className="h-full m-0 p-0 data-[state=active]:fade-in">
              <ReceptionDashboard onCallGuest={handleStartCall} />
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

      {isCallActive && selectedGuest && (
        <CallInterface 
          isGuest={false}
          guestId={selectedGuest.id}
          roomNumber={selectedGuest.roomNumber}
          guestName={selectedGuest.name}
          onClose={handleEndCall}
        />
      )}
    </div>
  );
};

export default ReceptionDashboardPage;
