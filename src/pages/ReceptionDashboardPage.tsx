import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { sendNotificationToGuest, formatMessageNotification } from "@/utils/notification";
import { motion } from "framer-motion";
import { MessageSquare, BarChart, Bed } from "lucide-react";

// Imported components
import LoadingScreen from "@/components/LoadingScreen";
import ReceptionHeader from "@/components/ReceptionHeader";
import ReceptionDesktopTabs from "@/components/ReceptionDesktopTabs";
import ReceptionDashboardLayout from "@/components/ReceptionDashboardLayout";
import ReceptionDashboardWrapper from "@/components/ReceptionDashboardWrapper";
import DashboardStats from "@/components/DashboardStats";
import RoomManagement from "@/components/RoomManagement";
import NotificationBanner from "@/components/NotificationBanner";

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

  // Check authentication with Supabase Auth
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
          variant: "destructive"
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

  // Set up real-time subscription for notifications
  useEffect(() => {
    // Create a subscription for new messages to show notifications
    const messagesChannel = supabase.channel("new-message-notifications")
      .on("postgres_changes", {
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
        
        // Get guest information to send notification
        const getMessage = async () => {
          try {
            // Get guest information by guest_id
            const { data: guest } = await supabase
              .from('guests')
              .select('name, room_number')
              .eq('id', payload.new.guest_id)
              .single();
              
            if (guest) {
              // Send notification via edge function
              sendNotificationToGuest(
                payload.new.guest_id,
                formatMessageNotification(
                  false, // isGuest
                  payload.new.content,
                  guest.name,
                  guest.room_number,
                  payload.new.guest_id
                )
              );
            }
          } catch (error) {
            console.error("Error fetching guest data for notification:", error);
          }
        };
        
        getMessage();
      })
      .subscribe();
    
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

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Componente de barra de navegación móvil
  const MobileNavBar = () => (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50"
    >
      <div className="flex justify-around py-1">
        <NavButton 
          icon={<MessageSquare />}
          label="Mensajes"
          isActive={activeTab === "messages"}
          onClick={() => setActiveTab("messages")}
        />
        <NavButton 
          icon={<BarChart />}
          label="Estadísticas"
          onClick={() => setActiveTab("stats")}
          isActive={activeTab === "stats"}
        />
        <NavButton 
          icon={<Bed />}
          label="Cabañas"
          onClick={() => setActiveTab("rooms")}
          isActive={activeTab === "rooms"}
        />
      </div>
    </motion.div>
  );

  // Componente para botones de navegación
  const NavButton = ({ icon, label, isActive, onClick }: { 
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
  }) => {
    // Clonar el icono con las propiedades necesarias
    const iconElement = React.isValidElement(icon)
      ? React.cloneElement(icon as React.ReactElement, {
          size: 18,
          className: `${isActive ? "text-hotel-700" : "text-gray-500"}`
        })
      : null;
    
    return (
      <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center px-4 py-0.5 ${
          isActive 
            ? "text-hotel-800" 
            : "text-gray-500"
        }`}
      >
        <div className={`mb-0.5 ${isActive ? "text-hotel-700" : ""}`}>
          {iconElement}
        </div>
        <span className="text-[10px]">{label}</span>
        {isActive && (
          <motion.div 
            layoutId="bottom-nav-indicator"
            className="absolute top-0 h-0.5 w-10 bg-hotel-700" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
          />
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Notification Banner */}
      <NotificationBanner type="reception" />
    
      {/* Header */}
      <ReceptionHeader 
        user={user}
        handleLogout={handleLogout}
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className={`pt-[80px] ${isMobile ? 'pb-16' : ''}`}>
        <div className="container mx-auto px-3 py-2 max-w-7xl">
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="space-y-3"
          >
            {/* Tabs Content */}
            <div className={`min-h-[calc(100vh-180px)] ${isMobile ? 'mb-16' : ''}`}>
              {/* Messages Tab */}
              <TabsContent 
                value="messages" 
                className="m-0 h-full data-[state=active]:animate-in fade-in-50 duration-200"
              >
                <ReceptionDashboardLayout
                  activeTab={activeTab}
                  isCallActive={isCallActive}
                  selectedGuest={selectedGuest}
                  handleEndCall={handleEndCall}
                >
                  <ReceptionDashboardWrapper onCallGuest={handleStartCall} />
                </ReceptionDashboardLayout>
              </TabsContent>
              
              {/* Stats Tab */}
              <TabsContent 
                value="stats" 
                className="m-0 h-full data-[state=active]:animate-in fade-in-50 duration-200"
              >
                <div className="p-1">
                  <h2 className="text-xl font-semibold mb-2">Estadísticas</h2>
                  <DashboardStats />
                </div>
              </TabsContent>
              
              {/* Rooms Tab */}
              <TabsContent 
                value="rooms" 
                className="m-0 h-full data-[state=active]:animate-in fade-in-50 duration-200"
              >
                <div className="p-1">
                  <h2 className="text-xl font-semibold mb-2">Gestión de Habitaciones</h2>
                  <RoomManagement showGuestCount={true} />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>

      {/* Barra de navegación móvil */}
      {isMobile && <MobileNavBar />}
    </div>
  );
};

export default ReceptionDashboardPage;
