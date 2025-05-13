import { useState, useEffect } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { Bell, X, CheckCircle, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";

interface NotificationBannerProps {
  type: 'guest' | 'reception';
  guestId?: string;
  roomId?: string;
  roomNumber?: string;
}

const NotificationBanner = ({ 
  type, 
  guestId, 
  roomId, 
  roomNumber 
}: NotificationBannerProps) => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    requestPermission 
  } = useNotifications({
    type,
    guestId,
    roomId,
    roomNumber
  });

  // Show notification banner if conditions are met
  useEffect(() => {
    const shouldShow = 
      isSupported && 
      !isSubscribed && 
      permission !== 'granted' && 
      permission !== 'denied' &&
      !dismissed;
    
    if (shouldShow) {
      // Add small delay for better UX
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isSupported, isSubscribed, permission, dismissed]);

  // Handle allow notifications
  const handleAllow = async () => {
    const granted = await requestPermission();
    if (granted) {
      setVisible(false);
      
      // Store in localStorage to avoid showing again
      localStorage.setItem('notifications_banner_dismissed', 'true');
    }
  };

  // Handle dismiss
  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    
    // Store in localStorage to avoid showing again
    localStorage.setItem('notifications_banner_dismissed', 'true');
  };

  // Load dismissed state from localStorage on mount
  useEffect(() => {
    const isDismissed = localStorage.getItem('notifications_banner_dismissed') === 'true';
    setDismissed(isDismissed);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-50 bg-hotel-50/95 backdrop-blur-sm supports-[backdrop-filter]:bg-hotel-50/90 border-b border-hotel-100 shadow-sm"
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ 
            type: "spring", 
            damping: 30, 
            stiffness: 300,
            mass: 0.8
          }}
        >
          {/* Barra superior decorativa con animación */}
          <motion.div 
            className="h-0.5 w-full bg-gradient-to-r from-hotel-400 to-hotel-500"
            initial={{ scaleX: 0, transformOrigin: "left" }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          />
          
          <div className="container max-w-7xl mx-auto py-2.5 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="bg-hotel-100 p-1.5 rounded-full"
                  initial={{ scale: 0.8, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                    delay: 0.1
                  }}
                  whileHover={{ 
                    scale: 1.1,
                    backgroundColor: "hsl(var(--hotel-200))",
                    boxShadow: "0 0 8px rgba(0, 0, 0, 0.1)"
                  }}
                >
                  <Bell className="h-4 w-4 text-hotel-600 flex-shrink-0" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <p className="text-sm font-medium text-hotel-800">
                    {type === 'guest' 
                      ? '¿Deseas recibir notificaciones cuando recepción responda?' 
                      : '¿Deseas recibir notificaciones de los huéspedes?'}
                  </p>
                </motion.div>
              </div>
              
              <div className="flex items-center gap-2">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.2 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={handleAllow}
                    className="h-8 bg-hotel-600 hover:bg-hotel-700 text-white relative overflow-hidden btn-ripple btn-shine"
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    Permitir
                  </Button>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.2 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleDismiss}
                    className="h-8 border-hotel-200 text-hotel-700 hover:bg-hotel-50 relative overflow-hidden btn-ripple"
                  >
                    <BellOff className="h-4 w-4 mr-1.5" />
                    No, gracias
                  </Button>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, rotate: -10 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.5, duration: 0.2 }}
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  whileTap={{ scale: 0.9, rotate: 0 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDismiss}
                    className="h-7 w-7 text-hotel-400 hover:text-hotel-600 hover:bg-hotel-100/80 rounded-full"
                    aria-label="Cerrar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationBanner; 