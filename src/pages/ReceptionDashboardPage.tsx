import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReceptionDashboard from "@/components/ReceptionDashboard";
import RoomManagement from "@/components/RoomManagement";
import DashboardStats from "@/components/DashboardStats";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hotel, LogOut, MessageSquare, BarChart, Bed, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import CallInterface from "@/components/CallInterface";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import type { RoomManagementProps } from "@/components/RoomManagementProps";

const ReceptionDashboardPage = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
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

  // Check authentication with Supabase Auth
  useEffect(() => {
    const getSession = async () => {
      try {
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
        setUser(session?.user || null);
        if (!session) {
          navigate("/reception");
        }
      } catch (error) {
        console.error("Error getting session:", error);
        toast({
          title: "Error de sesión",
          description: "No se pudo verificar tu sesión. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        navigate("/reception");
      } finally {
        setIsLoading(false);
      }
    };
    getSession();

    // Subscribe to auth changes
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (event === "SIGNED_OUT") {
        navigate("/reception");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  // Set up real-time subscription for notifications
  useEffect(() => {
    // Create a subscription for new messages to show notifications
    const messagesChannel = supabase.channel("new-message-notifications").on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: "is_guest=eq.true"
    }, payload => {
      // Show notification for new guest message
      toast({
        title: "Nuevo mensaje",
        description: "Has recibido un nuevo mensaje de un huésped.",
        variant: "default"
      });

      // If not on messages tab, add a visual indication
      if (activeTab !== "messages") {
        // Add visual indication here if needed
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [toast, activeTab]);
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente."
      });
      navigate("/reception");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "No se pudo cerrar sesión. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };
  const handleStartCall = (guest: {
    id: string;
    name: string;
    roomNumber: string;
  }) => {
    setSelectedGuest(guest);
    setIsCallActive(true);
  };
  const handleEndCall = () => {
    setIsCallActive(false);
    setSelectedGuest(null);
  };

  // Mobile slide-in menu from left
  const mobileSidebarVariants = {
    hidden: {
      x: '-100%',
      opacity: 0
    },
    visible: {
      x: '0%',
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      x: '-100%',
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: 'easeInOut'
      }
    }
  };
  if (isLoading) {
    return <div className="h-screen flex items-center justify-center bg-gray-50">
        <motion.div initial={{
        opacity: 0,
        scale: 0.8
      }} animate={{
        opacity: 1,
        scale: 1
      }} transition={{
        duration: 0.5,
        type: "spring"
      }} className="flex flex-col items-center">
          <div className="w-16 h-16 mb-4 rounded-full border-4 border-hotel-600 border-t-transparent animate-spin" />
          <p className="text-hotel-700 font-medium">Cargando...</p>
        </motion.div>
      </div>;
  }
  return <div className="flex flex-col h-screen">
      {/* Enhanced header with gradient and animation */}
      <header className="bg-gradient-to-r from-hotel-700 to-hotel-500 shadow-lg relative z-10">
        <div className="container mx-auto py-3 px-4 flex justify-between items-center">
          <motion.div className="flex items-center" initial={{
          x: -10,
          opacity: 0
        }} animate={{
          x: 0,
          opacity: 1
        }} transition={{
          duration: 0.3
        }}>
            {isMobile && <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="mr-2 text-white hover:bg-white/20">
                    <Menu className="h-5 w-5 text-white" />
                    <span className="sr-only">Menú</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 border-r-0 w-[250px] shadow-xl">
                  <div className="bg-gradient-to-r from-hotel-800 to-hotel-600 text-white p-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <motion.div initial={{
                    scale: 0.9,
                    rotate: -5
                  }} animate={{
                    scale: 1,
                    rotate: 0
                  }} transition={{
                    duration: 0.3
                  }}>
                        <Hotel className="h-5 w-5 text-white" />
                      </motion.div>
                      <h2 className="text-lg font-medium">Parque Temático Quimbaya</h2>
                    </div>
                    
                  </div>
                  <nav className="p-0">
                    <div className="py-2">
                      {user && <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm text-gray-500">Conectado como:</p>
                          <p className="font-medium truncate">{user.email}</p>
                        </div>}
                      <ul className="space-y-1 mt-2">
                        <motion.li whileHover={{
                      x: 3
                    }} transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 10
                    }}>
                          <Button variant="ghost" className={`w-full justify-start text-gray-700 rounded-none border-l-2 ${activeTab === "messages" ? "border-hotel-600 bg-hotel-50/50" : "border-transparent"}`} onClick={() => {
                        setActiveTab("messages");
                        setSidebarOpen(false);
                      }}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Mensajes
                          </Button>
                        </motion.li>
                        <motion.li whileHover={{
                      x: 3
                    }} transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 10
                    }}>
                          <Button variant="ghost" className={`w-full justify-start text-gray-700 rounded-none border-l-2 ${activeTab === "stats" ? "border-hotel-600 bg-hotel-50/50" : "border-transparent"}`} onClick={() => {
                        setActiveTab("stats");
                        setSidebarOpen(false);
                      }}>
                            <BarChart className="h-4 w-4 mr-2" />
                            Estadísticas
                          </Button>
                        </motion.li>
                        <motion.li whileHover={{
                      x: 3
                    }} transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 10
                    }}>
                          <Button variant="ghost" className={`w-full justify-start text-gray-700 rounded-none border-l-2 ${activeTab === "rooms" ? "border-hotel-600 bg-hotel-50/50" : "border-transparent"}`} onClick={() => {
                        setActiveTab("rooms");
                        setSidebarOpen(false);
                      }}>
                            <Bed className="h-4 w-4 mr-2" />
                            Cabañas
                          </Button>
                        </motion.li>
                      </ul>
                    </div>
                    
                    <div className="border-t mt-4 pt-2 px-4">
                      <ConnectionStatusIndicator className="mb-4 mt-2" />
                      
                      <Button variant="outline" className="w-full justify-start" onClick={() => {
                    setSidebarOpen(false);
                    handleLogout();
                  }}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Cerrar sesión
                      </Button>
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>}
            
            <motion.div className="flex items-center" initial={{
            scale: 0.9
          }} animate={{
            scale: 1
          }} transition={{
            type: "spring",
            stiffness: 300,
            damping: 20
          }}>
              <Hotel className="h-6 w-6 mr-2 text-white" />
              <h1 className={`font-bold ${isMobile ? "text-lg" : "text-xl"} text-white`}>
                Dashboard de Recepción
              </h1>
            </motion.div>
          </motion.div>
          
          <div className="flex items-center space-x-2">
            {!isMobile && <ConnectionStatusIndicator className="bg-white/10 text-white" />}
            
            {user && !isMobile && <motion.span initial={{
            opacity: 0,
            x: 20
          }} animate={{
            opacity: 1,
            x: 0
          }} transition={{
            duration: 0.3
          }} className="text-sm bg-white/10 px-3 py-1 rounded-full text-white">
                {user.email}
              </motion.span>}
            
            <motion.div whileHover={{
            scale: 1.05
          }} whileTap={{
            scale: 0.95
          }}>
              <Button variant="ghost" className="text-white hover:bg-white/20 transition-colors" onClick={handleLogout} size={isMobile ? "sm" : "default"}>
                <LogOut className="h-4 w-4 mr-2" />
                {isMobile ? "" : "Cerrar sesión"}
              </Button>
            </motion.div>
          </div>
        </div>
      </header>
      
      <div className="flex-grow overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {!isMobile && <div className="bg-white border-b shadow-sm sticky top-0 z-10">
              <div className="container mx-auto">
                <TabsList className="h-14">
                  <TabsTrigger value="messages" className="flex items-center gap-2 relative transition-all duration-300">
                    <MessageSquare className="h-4 w-4" />
                    <span>Mensajes</span>
                    {activeTab === "messages" && <motion.div layoutId="active-tab-indicator" className="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-hotel-600" initial={{
                  opacity: 0
                }} animate={{
                  opacity: 1
                }} exit={{
                  opacity: 0
                }} />}
                  </TabsTrigger>
                  <TabsTrigger value="stats" className="flex items-center gap-2 relative transition-all duration-300">
                    <BarChart className="h-4 w-4" />
                    <span>Estadísticas</span>
                    {activeTab === "stats" && <motion.div layoutId="active-tab-indicator" className="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-hotel-600" initial={{
                  opacity: 0
                }} animate={{
                  opacity: 1
                }} exit={{
                  opacity: 0
                }} />}
                  </TabsTrigger>
                  <TabsTrigger value="rooms" className="flex items-center gap-2 relative transition-all duration-300">
                    <Bed className="h-4 w-4" />
                    <span>Cabañas</span>
                    {activeTab === "rooms" && <motion.div layoutId="active-tab-indicator" className="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-hotel-600" initial={{
                  opacity: 0
                }} animate={{
                  opacity: 1
                }} exit={{
                  opacity: 0
                }} />}
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>}
          
          <div className="flex-grow overflow-auto">
            <TabsContent value="messages" className="h-full m-0 p-0 data-[state=active]:fade-in">
              <ReceptionDashboard onCallGuest={handleStartCall} />
            </TabsContent>
            <TabsContent value="stats" className="h-full m-0 p-0 data-[state=active]:fade-in">
              <DashboardStats />
            </TabsContent>
            <TabsContent value="rooms" className="h-full m-0 p-0 data-[state=active]:fade-in">
              <RoomManagement showGuestCount={true} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Animated call interface */}
      <AnimatePresence>
        {isCallActive && selectedGuest && <motion.div initial={{
        opacity: 0,
        y: 50
      }} animate={{
        opacity: 1,
        y: 0
      }} exit={{
        opacity: 0,
        y: 50
      }} transition={{
        type: "spring",
        damping: 25,
        stiffness: 500
      }}>
            <CallInterface isGuest={false} guestId={selectedGuest.id} roomNumber={selectedGuest.roomNumber} guestName={selectedGuest.name} onClose={handleEndCall} />
          </motion.div>}
      </AnimatePresence>
    </div>;
};
export default ReceptionDashboardPage;
