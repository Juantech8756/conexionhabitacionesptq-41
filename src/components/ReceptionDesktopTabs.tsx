
import { motion } from "framer-motion";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, BarChart, Bed } from "lucide-react";

interface ReceptionDesktopTabsProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const ReceptionDesktopTabs = ({ activeTab, setActiveTab }: ReceptionDesktopTabsProps) => {
  return (
    <div className="bg-white border-b shadow-sm sticky top-14 z-30">
      <div className="container mx-auto">
        <TabsList className="h-14">
          <TabsTrigger 
            value="messages" 
            className="flex items-center gap-2 relative transition-all duration-300"
            onClick={() => setActiveTab("messages")}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Mensajes</span>
            {activeTab === "messages" && (
              <motion.div 
                layoutId="active-tab-indicator" 
                className="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-hotel-600" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
              />
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="stats" 
            className="flex items-center gap-2 relative transition-all duration-300"
            onClick={() => setActiveTab("stats")}
          >
            <BarChart className="h-4 w-4" />
            <span>Estadísticas</span>
            {activeTab === "stats" && (
              <motion.div 
                layoutId="active-tab-indicator" 
                className="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-hotel-600" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
              />
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="rooms" 
            className="flex items-center gap-2 relative transition-all duration-300"
            onClick={() => setActiveTab("rooms")}
          >
            <Bed className="h-4 w-4" />
            <span>Cabañas</span>
            {activeTab === "rooms" && (
              <motion.div 
                layoutId="active-tab-indicator" 
                className="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-hotel-600" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
              />
            )}
          </TabsTrigger>
        </TabsList>
      </div>
    </div>
  );
};

export default ReceptionDesktopTabs;
