import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Hotel, LogOut, Menu, MessageSquare, BarChart, Bed } from "lucide-react";
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
    <header className={`bg-gradient-to-r from-hotel-800 to-hotel-700 shadow-lg fixed top-0 left-0 right-0 z-50 ${isMobile ? 'py-2' : 'py-3'}`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
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
              <motion.div 
                className={`bg-white/10 ${isMobile ? 'p-1' : 'p-1.5'} rounded-full mr-3 flex items-center justify-center`}
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
                  backgroundColor: "rgba(255, 255, 255, 0.15)"
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 10 
                }}
              >
                <Hotel className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-white`} />
              </motion.div>
              <motion.h1 
                className={`font-bold ${isMobile ? "text-base" : "text-xl"} text-white`}
                whileHover={{ letterSpacing: "0.01em" }}
                transition={{ duration: 0.3 }}
              >
                Parque Temático Quimbaya
              </motion.h1>
            </motion.div>
          </motion.div>
          
          <div className="flex items-center space-x-2">
            {!isMobile && <ConnectionStatusIndicator className="text-white" />}
            
            {user && !isMobile && (
              <motion.span 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ duration: 0.3 }} 
                className="text-sm bg-white/10 px-3 py-1 rounded-full text-white group"
                whileHover={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  scale: 1.02
                }}
              >
                <span className="inline-block group-hover:translate-x-0.5 transition-transform">
                  {user.email}
                </span>
              </motion.span>
            )}
            
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/20 hover:text-white transition-colors relative overflow-hidden btn-ripple" 
                onClick={handleLogout} 
                size={isMobile ? "sm" : "default"}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isMobile ? "" : "Cerrar sesión"}
              </Button>
            </motion.div>
          </div>
        </div>
        
        {/* Opciones de navegación en versión escritorio - removidas de la versión móvil */}
        {!isMobile && (
          <div className="flex items-center mt-3 border-t border-white/20 pt-2">
            <NavButton 
              icon={<MessageSquare className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />}
              label="Mensajes"
              isActive={activeTab === "messages"}
              onClick={() => setActiveTab("messages")}
            />
            <NavButton 
              icon={<BarChart className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />}
              label="Estadísticas"
              isActive={activeTab === "stats"}
              onClick={() => setActiveTab("stats")}
            />
            <NavButton 
              icon={<Bed className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />}
              label="Cabañas"
              isActive={activeTab === "rooms"}
              onClick={() => setActiveTab("rooms")}
            />
          </div>
        )}
      </div>
    </header>
  );
};

// Componente mejorado para botones de navegación
interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const NavButton = ({ icon, label, isActive, onClick }: NavButtonProps) => {
  return (
    <Button
      variant="ghost"
      className={`text-white hover:bg-white/20 hover:text-white transition-all duration-300 relative group btn-ripple
        ${isActive ? "bg-white/10 font-medium" : "font-normal"}
      `}
      onClick={onClick}
    >
      {icon}
      <span className="relative">
        {label}
        {!isActive && (
          <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-white transition-all duration-300 group-hover:w-full"></span>
        )}
      </span>
      {isActive && (
        <motion.div 
          layoutId="active-tab-indicator" 
          className="absolute -bottom-[2px] left-0 right-0 h-0.5 bg-white" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30
          }}
        />
      )}
    </Button>
  );
};

export default ReceptionHeader;
