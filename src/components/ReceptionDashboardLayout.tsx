import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CallInterface from "@/components/CallInterface";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReceptionDashboardLayoutProps {
  activeTab: string;
  children: ReactNode;
  isCallActive: boolean;
  selectedGuest: {
    id: string;
    name: string;
    roomNumber: string;
  } | null;
  handleEndCall: () => void;
}

const ReceptionDashboardLayout = ({
  children,
  isCallActive,
  selectedGuest,
  handleEndCall
}: ReceptionDashboardLayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <motion.div 
      className="relative overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        duration: 0.4 
      }}
    >
      {/* Barra superior decorativa con animación */}
      <motion.div 
        className="h-1 w-full bg-gradient-to-r from-hotel-700 to-hotel-800"
        initial={{ scaleX: 0, transformOrigin: "left" }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      />
      
      {/* Main Content Area con altura mínima optimizada para diferentes dispositivos */}
      <div className={`${isMobile ? 'min-h-[calc(100vh-180px)]' : 'min-h-[calc(100vh-180px)]'} flex flex-col`}>
        {children}
      </div>

      {/* Call Interface Overlay */}
      <AnimatePresence>
        {isCallActive && selectedGuest && (
          <motion.div 
            className="fixed inset-x-0 bottom-0 z-50"
            initial={{ opacity: 0, y: 100 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 100 }} 
            transition={{ 
              type: "spring", 
              damping: 30, 
              stiffness: 300,
              mass: 0.8 
            }}
          >
            <motion.div 
              className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-t border-hotel-100 shadow-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className={`${isMobile ? 'p-3' : 'container mx-auto max-w-7xl p-4'}`}>
                <CallInterface
                  isGuest={false}
                  guestId={selectedGuest.id}
                  roomNumber={selectedGuest.roomNumber}
                  guestName={selectedGuest.name}
                  onClose={handleEndCall}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ReceptionDashboardLayout;
