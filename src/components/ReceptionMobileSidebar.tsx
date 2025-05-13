import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Hotel, LogOut, MessageSquare, BarChart, Bed, Menu } from "lucide-react";
import { motion } from "framer-motion";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import { User } from "@supabase/supabase-js";

interface ReceptionMobileSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  handleLogout: () => void;
}

const ReceptionMobileSidebar = ({
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  setActiveTab,
  user,
  handleLogout
}: ReceptionMobileSidebarProps) => {
  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="mr-2 text-white hover:text-white hover:bg-white/20 btn-ripple">
          <Menu className="h-5 w-5 text-white" />
          <span className="sr-only">Menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 border-r-0 w-[250px] shadow-xl">
        <div className="bg-gradient-to-r from-hotel-800 to-hotel-600 text-white p-5">
          <div className="flex items-center gap-3 mb-2">
            <motion.div 
              initial={{ scale: 0.9, rotate: -5 }} 
              animate={{ scale: 1, rotate: 0 }} 
              transition={{ duration: 0.3 }}
              className="bg-white/10 p-2 rounded-full"
              whileHover={{ 
                scale: 1.1,
                boxShadow: "0 0 10px rgba(255, 255, 255, 0.2)"
              }}
            >
              <Hotel className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <motion.h2 
                className="text-lg font-medium"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                Parque Temático Quimbaya
              </motion.h2>
            </div>
          </div>
          <motion.p 
            className="text-sm text-white/80 ml-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            Panel de administración
          </motion.p>
        </div>
        <nav className="p-0">
          <div className="py-2">
            {user && (
              <motion.div 
                className="px-4 py-3 border-b border-gray-100"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <p className="text-sm text-gray-500">Conectado como:</p>
                <p className="font-medium truncate text-hotel-700">{user.email}</p>
              </motion.div>
            )}
            <motion.ul 
              className="space-y-1 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <SidebarNavItem
                icon={<MessageSquare className="h-4 w-4 mr-2" />}
                label="Mensajes"
                isActive={activeTab === "messages"}
                onClick={() => {
                  setActiveTab("messages");
                  setSidebarOpen(false);
                }}
              />
              <SidebarNavItem
                icon={<BarChart className="h-4 w-4 mr-2" />}
                label="Estadísticas"
                isActive={activeTab === "stats"}
                onClick={() => {
                  setActiveTab("stats");
                  setSidebarOpen(false);
                }}
              />
              <SidebarNavItem
                icon={<Bed className="h-4 w-4 mr-2" />}
                label="Cabañas"
                isActive={activeTab === "rooms"}
                onClick={() => {
                  setActiveTab("rooms");
                  setSidebarOpen(false);
                }}
              />
            </motion.ul>
          </div>
          
          <motion.div 
            className="border-t mt-4 pt-2 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            <ConnectionStatusIndicator className="mb-4 mt-2 text-hotel-700" />
            
            <Button 
              variant="outline" 
              className="w-full justify-start border-hotel-200 text-hotel-700 hover:bg-hotel-50 hover:text-hotel-800 btn-ripple transition-all" 
              onClick={() => {
                setSidebarOpen(false);
                handleLogout();
              }}
            >
              <LogOut className="h-4 w-4 mr-2 transition-transform group-hover:rotate-12" />
              <span className="group-hover:translate-x-0.5 transition-transform">
                Cerrar sesión
              </span>
            </Button>
          </motion.div>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

// Componente para elementos de navegación del sidebar
interface SidebarNavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const SidebarNavItem = ({ icon, label, isActive, onClick }: SidebarNavItemProps) => {
  return (
    <motion.li 
      whileHover={{ x: 3 }} 
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <Button 
        variant="ghost" 
        className={`w-full justify-start rounded-none border-l-2 group btn-ripple transition-all
          ${
            isActive 
              ? "border-hotel-600 bg-hotel-50/50 text-hotel-800 font-medium" 
              : "border-transparent text-gray-700"
          }
        `} 
        onClick={onClick}
      >
        <span className="transition-transform duration-200 group-hover:scale-110">
          {icon}
        </span>
        <span className={`relative ${isActive ? "" : "group-hover:text-hotel-600"}`}>
          {label}
          {!isActive && (
            <span className="absolute -bottom-0.5 left-0 w-0 h-[1px] bg-hotel-500 transition-all duration-300 group-hover:w-full"></span>
          )}
        </span>
      </Button>
    </motion.li>
  );
};

export default ReceptionMobileSidebar;
