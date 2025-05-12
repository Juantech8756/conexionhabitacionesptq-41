
import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CallInterface from "@/components/CallInterface";

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
  return (
    <>
      <div className="flex-grow overflow-auto relative pt-0">
        {children}
      </div>

      {/* Animated call interface */}
      <AnimatePresence>
        {isCallActive && selectedGuest && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            transition={{ type: "spring", damping: 25, stiffness: 500 }}
            className="z-50 fixed bottom-0 left-0 right-0 flex justify-center"
          >
            <CallInterface
              isGuest={false}
              guestId={selectedGuest.id}
              roomNumber={selectedGuest.roomNumber}
              guestName={selectedGuest.name}
              onClose={handleEndCall}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ReceptionDashboardLayout;
