
import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ConnectionStatusIndicatorProps {
  className?: string;
}

const ConnectionStatusIndicator = ({ className }: ConnectionStatusIndicatorProps) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    // Set up listeners for real-time connection status
    const channel = supabase.channel('connection-status');
    
    // Listen to connection status changes
    const subscription = channel
      .on('system', { event: 'connected' }, () => {
        setIsConnected(true);
        setIsReconnecting(false);
      })
      .on('system', { event: 'disconnected' }, () => {
        setIsConnected(false);
        setIsReconnecting(false);
      })
      .on('system', { event: 'connecting' }, () => {
        setIsReconnecting(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div 
      className={cn(
        "flex items-center gap-1 text-xs rounded-full px-2 py-0.5 transition-colors",
        isConnected ? "text-green-600 bg-green-50" : 
        isReconnecting ? "text-amber-600 bg-amber-50 animate-pulse" : 
        "text-red-600 bg-red-50",
        className
      )}
      title={
        isConnected ? "Conectado en tiempo real" : 
        isReconnecting ? "Reconectando..." : 
        "Desconectado"
      }
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          <span className="hidden sm:inline">Conectado</span>
        </>
      ) : isReconnecting ? (
        <>
          <Wifi className="h-3 w-3 animate-pulse" />
          <span className="hidden sm:inline">Reconectando...</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span className="hidden sm:inline">Desconectado</span>
        </>
      )}
    </div>
  );
};

export default ConnectionStatusIndicator;
