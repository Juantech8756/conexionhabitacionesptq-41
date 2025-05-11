
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import GuestChat from "@/components/GuestChat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Hotel } from "lucide-react";
import { motion } from "framer-motion";

const GuestSimulation = () => {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("room");
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState<{id: string; room_number: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchRoomData = async () => {
      if (!roomId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('id, room_number')
          .eq('id', roomId)
          .single();
        
        if (error) throw error;
        setRoomData(data);
      } catch (error) {
        console.error("Error fetching room data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomData();
  }, [roomId]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header with return button */}
      <header className="bg-gradient-to-r from-hotel-700 to-hotel-500 p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="mr-2 text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center">
              <Hotel className="h-6 w-6 text-white mr-2" />
              <div>
                <h1 className="font-bold text-white text-lg">Simulación Portal del Huésped</h1>
                {roomData && (
                  <p className="text-white/80 text-sm">
                    Cabaña {roomData.room_number}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white/20 text-white rounded-lg px-3 py-1 text-sm">
            Vista de Simulación
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 border-4 border-t-transparent border-hotel-600 rounded-full animate-spin mb-4"></div>
              <p className="text-hotel-700">Cargando información...</p>
            </motion.div>
          </div>
        ) : (
          <div className="h-full">
            <GuestChat isSimulationMode={true} preselectedRoomId={roomId} />
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestSimulation;
