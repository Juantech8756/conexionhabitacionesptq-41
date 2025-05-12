
import { motion } from "framer-motion";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, BarChart, Bed } from "lucide-react";

interface ReceptionDesktopTabsProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const ReceptionDesktopTabs = ({ activeTab, setActiveTab }: ReceptionDesktopTabsProps) => {
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm sticky top-14 z-30">
      <div className="max-w-screen-2xl mx-auto">
        <TabsList className="h-14 w-full justify-start bg-transparent p-0 gap-6">
          <TabsTrigger 
            value="messages" 
            className="flex items-center gap-2 relative transition-all duration-300 h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
            onClick={() => setActiveTab("messages")}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-base font-medium">Mensajes</span>
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
            className="flex items-center gap-2 relative transition-all duration-300 h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
            onClick={() => setActiveTab("stats")}
          >
            <BarChart className="h-5 w-5" />
            <span className="text-base font-medium">Estadísticas</span>
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
            className="flex items-center gap-2 relative transition-all duration-300 h-full data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4"
            onClick={() => setActiveTab("rooms")}
          >
            <Bed className="h-5 w-5" />
            <span className="text-base font-medium">Cabañas</span>
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
