
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
        <Button variant="ghost" size="icon" className="mr-2 text-white hover:bg-white/20">
          <Menu className="h-5 w-5 text-white" />
          <span className="sr-only">Menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 border-r-0 w-[250px] shadow-xl">
        <div className="bg-gradient-to-r from-hotel-800 to-hotel-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div 
              initial={{ scale: 0.9, rotate: -5 }} 
              animate={{ scale: 1, rotate: 0 }} 
              transition={{ duration: 0.3 }}
            >
              <Hotel className="h-5 w-5 text-white" />
            </motion.div>
            <h2 className="text-lg font-medium">Parque Temático Quimbaya</h2>
          </div>
        </div>
        <nav className="p-0">
          <div className="py-2">
            {user && (
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm text-gray-500">Conectado como:</p>
                <p className="font-medium truncate">{user.email}</p>
              </div>
            )}
            <ul className="space-y-1 mt-2">
              <motion.li 
                whileHover={{ x: 3 }} 
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start text-gray-700 rounded-none border-l-2 ${
                    activeTab === "messages" ? "border-hotel-600 bg-hotel-50/50" : "border-transparent"
                  }`} 
                  onClick={() => {
                    setActiveTab("messages");
                    setSidebarOpen(false);
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Mensajes
                </Button>
              </motion.li>
              <motion.li 
                whileHover={{ x: 3 }} 
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start text-gray-700 rounded-none border-l-2 ${
                    activeTab === "stats" ? "border-hotel-600 bg-hotel-50/50" : "border-transparent"
                  }`} 
                  onClick={() => {
                    setActiveTab("stats");
                    setSidebarOpen(false);
                  }}
                >
                  <BarChart className="h-4 w-4 mr-2" />
                  Estadísticas
                </Button>
              </motion.li>
              <motion.li 
                whileHover={{ x: 3 }} 
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start text-gray-700 rounded-none border-l-2 ${
                    activeTab === "rooms" ? "border-hotel-600 bg-hotel-50/50" : "border-transparent"
                  }`} 
                  onClick={() => {
                    setActiveTab("rooms");
                    setSidebarOpen(false);
                  }}
                >
                  <Bed className="h-4 w-4 mr-2" />
                  Cabañas
                </Button>
              </motion.li>
            </ul>
          </div>
          
          <div className="border-t mt-4 pt-2 px-4">
            <ConnectionStatusIndicator className="mb-4 mt-2" />
            
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => {
                setSidebarOpen(false);
                handleLogout();
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default ReceptionMobileSidebar;
