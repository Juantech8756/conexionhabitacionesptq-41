
import { useState } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, CheckCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface NotificationPermissionRequestProps {
  type: 'guest' | 'reception';
  guestId?: string;
  roomId?: string;
  roomNumber?: string;
  onPermissionChange?: (granted: boolean) => void;
  className?: string;
}

const NotificationPermissionRequest = ({
  type,
  guestId,
  roomId,
  roomNumber,
  onPermissionChange,
  className
}: NotificationPermissionRequestProps) => {
  const [showRequest, setShowRequest] = useState(true);
  const [animateOut, setAnimateOut] = useState(false);
  const { isSupported, permission, isSubscribed, requestPermission } = useNotifications({
    type,
    guestId,
    roomId,
    roomNumber
  });
  
  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (onPermissionChange) {
      onPermissionChange(granted);
    }
    
    if (granted) {
      setAnimateOut(true);
      setTimeout(() => {
        setShowRequest(false);
      }, 500);
    }
  };
  
  const handleDismiss = () => {
    setAnimateOut(true);
    setTimeout(() => {
      setShowRequest(false);
    }, 500);
    
    if (onPermissionChange) {
      onPermissionChange(false);
    }
  };
  
  // Don't show if not supported, already subscribed, or permission already denied
  if (!isSupported || isSubscribed || permission === 'denied' || !showRequest) {
    return null;
  }
  
  return (
    <AnimatePresence>
      {showRequest && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={`p-4 bg-white border rounded-lg shadow-md ${className}`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-hotel-600">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-grow">
              <h4 className="text-sm font-medium text-gray-900">Habilitar notificaciones</h4>
              <p className="text-xs text-gray-600 mt-1">
                {type === 'guest' 
                  ? 'Reciba notificaciones cuando recepción responda a sus mensajes.'
                  : 'Reciba notificaciones cuando los huéspedes envíen mensajes.'}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Button 
                  size="sm" 
                  variant="default"
                  className="bg-hotel-600 hover:bg-hotel-700"
                  onClick={handleRequestPermission}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Permitir
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleDismiss}
                >
                  <BellOff className="h-4 w-4 mr-1" />
                  Ahora no
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPermissionRequest;
