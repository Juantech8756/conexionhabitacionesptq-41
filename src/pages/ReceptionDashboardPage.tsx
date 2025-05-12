
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { sendNotificationToGuest, formatMessageNotification } from "@/utils/notification";

// Imported components
import LoadingScreen from "@/components/LoadingScreen";
import ReceptionHeader from "@/components/ReceptionHeader";
import ReceptionDesktopTabs from "@/components/ReceptionDesktopTabs";
import ReceptionDashboardLayout from "@/components/ReceptionDashboardLayout";
import ReceptionDashboardWrapper from "@/components/ReceptionDashboardWrapper";
import DashboardStats from "@/components/DashboardStats";
import RoomManagement from "@/components/RoomManagement";

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

  return (
    <div className="flex flex-col h-screen reception-dashboard">
      <ReceptionHeader 
        user={user}
        handleLogout={handleLogout}
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      
      <div className="flex-grow overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {!isMobile && <ReceptionDesktopTabs activeTab={activeTab} setActiveTab={setActiveTab} />}
          
          <div className="flex-grow overflow-auto">
            <TabsContent value="messages" className="h-full m-0 border-none data-[state=active]:fade-in">
              <ReceptionDashboardLayout
                activeTab={activeTab}
                isCallActive={isCallActive}
                selectedGuest={selectedGuest}
                handleEndCall={handleEndCall}
              >
                <ReceptionDashboardWrapper onCallGuest={handleStartCall} />
              </ReceptionDashboardLayout>
            </TabsContent>
            
            <TabsContent value="stats" className="h-full m-0 border-none data-[state=active]:fade-in">
              <div className="container mx-auto py-4 px-4">
                <DashboardStats />
              </div>
            </TabsContent>
            
            <TabsContent value="rooms" className="h-full m-0 border-none data-[state=active]:fade-in">
              <div className="container mx-auto py-4 px-4">
                <RoomManagement showGuestCount={true} />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default ReceptionDashboardPage;
