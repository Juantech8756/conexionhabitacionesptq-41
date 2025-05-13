import { useState, useEffect } from "react";
import ReceptionDashboard from "@/components/ReceptionDashboard";
import { useNotifications } from "@/hooks/use-notifications";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";

interface ReceptionDashboardWrapperProps {
  onCallGuest: (guest: {id: string; name: string; roomNumber: string}) => void;
}

const ReceptionDashboardWrapper = ({ onCallGuest }: ReceptionDashboardWrapperProps) => {
  // Wrapper component to handle dashboard functionality
  return (
    <div className="flex flex-col h-full">
      {/* Main Dashboard Content */}
      <div className="flex-1 p-6">
        <div className="h-full">
          <div className="flex items-center mb-6">
            <motion.div 
              className="bg-hotel-100 p-2 rounded-full mr-3 flex items-center justify-center"
              whileHover={{ 
                scale: 1.1,
                backgroundColor: "hsl(var(--hotel-200))"
              }}
              transition={{ 
                type: "spring", 
                stiffness: 400,
                damping: 10
              }}
            >
              <MessageSquare className="h-5 w-5 text-hotel-600" />
            </motion.div>
            <motion.h2 
              className="text-2xl font-semibold text-gray-800"
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              whileHover={{ 
                letterSpacing: "0.01em",
                color: "hsl(var(--hotel-800))"
              }}
            >
              Mensajes de Huéspedes
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 30,
              delay: 0.1
            }}
            className="relative"
          >
            {/* Elemento decorativo */}
            <motion.div 
              className="absolute -left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-hotel-400 to-transparent rounded-full"
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 0.7 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
            
            <ReceptionDashboard onCallGuest={onCallGuest} />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ReceptionDashboardWrapper;
