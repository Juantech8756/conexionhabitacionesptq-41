import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/use-notifications";
import { useRealtime } from "@/hooks/use-realtime";

interface ReceptionHeaderProps {
  user: User | null;
  onLogout: () => Promise<void>;
  isMobile: boolean;
  onToggleSidebar: () => void;
}

const ReceptionHeader = ({
  user,
  onLogout,
  isMobile,
  onToggleSidebar
}: ReceptionHeaderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { permission, isSubscribed } = useNotifications({ type: "reception" });
  
  // Use the realtime connection status hook
  const { isConnected } = useRealtime([], "reception-header");
  
  // Obtener la hora actual formateada
  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };
  
  // Estado para la hora actual
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  
  // Actualizar la hora cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <header className="dashboard-header-container" style={{
      height: '80px',
      width: '100%',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      alignItems: 'center',
      background: 'linear-gradient(to right, #6e4d31, #8b5a2b)', /* Color marrón como en la imagen */
      color: 'white',
      opacity: 1,
      visibility: 'visible'
    }}>
      <div className="flex items-center justify-between h-20 px-6 md:px-8 w-full">
        <div className="flex flex-col">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold">Hola</h1>
            {user && (
              <span className="ml-2 text-base text-white/90">
                {user.email?.split('@')[0]}
              </span>
            )}
          </div>
          <div className="text-sm text-white/80">
            {currentTime}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Indicador de estado de conexión */}
          <div className="hidden md:flex items-center mr-4">
            <div 
              className={`h-3 w-3 rounded-full mr-2 ${
                isConnected ? 'bg-green-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-base text-white/90">
              {isConnected ? 'Conectado' : 'Reconectando...'}
            </span>
          </div>
          
          {/* Notificaciones */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="lg"
                className="relative text-white hover:bg-white/15 h-12 w-12 rounded-full"
              >
                <Bell className="h-6 w-6" />
                {!isSubscribed && (
                  <span className="notification-indicator" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="sidebar-sheet-content p-0 w-full sm:w-[85vw] sm:max-w-[350px]">
              <div className="sidebar-header bg-gradient-to-r from-hotel-800 to-hotel-700 text-white p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Notificaciones</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/15 h-8 w-8 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4">
                <h4 className="text-sm font-medium mb-3">Estado de notificaciones</h4>
                <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Notificaciones</span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      isSubscribed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {isSubscribed ? 'Activadas' : 'Desactivadas'}
                    </span>
                  </div>
                  <Separator className="my-3" />
                  <p className="text-sm text-gray-600 mb-3">
                    {isSubscribed
                      ? "Recibirás notificaciones cuando lleguen nuevos mensajes."
                      : "Activa las notificaciones para recibir alertas de nuevos mensajes."}
                  </p>
                  {!isSubscribed && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-sm h-9"
                      onClick={() => {
                        if (permission === "default") {
                          Notification.requestPermission();
                        } else if (permission === "denied") {
                          alert("Por favor, activa las notificaciones en la configuración de tu navegador.");
                        }
                      }}
                    >
                      Activar notificaciones
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          {/* Botón de cerrar sesión */}
          <Button
            variant="ghost"
            size="lg"
            onClick={onLogout}
            className="text-white hover:bg-white/15 h-12 w-12 rounded-full"
          >
            <LogOut className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default ReceptionHeader;
