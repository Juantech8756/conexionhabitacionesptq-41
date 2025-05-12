
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Hotel, LogOut, Menu } from "lucide-react";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import { User } from "@supabase/supabase-js";
import ReceptionMobileSidebar from "./ReceptionMobileSidebar";

interface ReceptionHeaderProps {
  user: User | null;
  handleLogout: () => void;
  isMobile: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const ReceptionHeader = ({
  user,
  handleLogout,
  isMobile,
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  setActiveTab
}: ReceptionHeaderProps) => {
  return (
    <header className="bg-gradient-to-r from-hotel-700 to-hotel-500 shadow-lg fixed top-0 left-0 right-0 z-20">
      <div className="container mx-auto py-3 px-4 flex justify-between items-center">
        <motion.div 
          className="flex items-center" 
          initial={{ x: -10, opacity: 0 }} 
          animate={{ x: 0, opacity: 1 }} 
          transition={{ duration: 0.3 }}
        >
          {isMobile && (
            <ReceptionMobileSidebar
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              user={user}
              handleLogout={handleLogout}
            />
          )}
          
          <motion.div 
            className="flex items-center" 
            initial={{ scale: 0.9 }} 
            animate={{ scale: 1 }} 
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Hotel className="h-6 w-6 mr-2 text-white" />
            <h1 className={`font-bold ${isMobile ? "text-lg" : "text-xl"} text-white`}>
              Dashboard de Recepción
            </h1>
          </motion.div>
        </motion.div>
        
        <div className="flex items-center space-x-2">
          {!isMobile && <ConnectionStatusIndicator className="bg-white/10 text-white" />}
          
          {user && !isMobile && (
            <motion.span 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ duration: 0.3 }} 
              className="text-sm bg-white/10 px-3 py-1 rounded-full text-white"
            >
              {user.email}
            </motion.span>
          )}
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
  );
};

export default ReceptionHeader;
