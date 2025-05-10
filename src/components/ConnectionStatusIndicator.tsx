import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { REALTIME_LISTEN_TYPES } from "@supabase/supabase-js";
interface ConnectionStatusIndicatorProps {
  className?: string;
  variant?: "default" | "minimal";
}
const ConnectionStatusIndicator = ({
  className,
  variant = "default"
}: ConnectionStatusIndicatorProps) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  useEffect(() => {
    // Set up a dedicated channel just for monitoring connection status
    const channel = supabase.channel('system-connection-status');

    // Listen to connection status changes
    const subscription = channel.on(REALTIME_LISTEN_TYPES.SYSTEM, {
      event: 'connected'
    }, () => {
      console.log("Realtime connection established");
      setIsConnected(true);
      setIsReconnecting(false);
    }).on(REALTIME_LISTEN_TYPES.SYSTEM, {
      event: 'disconnected'
    }, () => {
      console.log("Realtime connection lost");
      setIsConnected(false);
      setIsReconnecting(false);
    }).on(REALTIME_LISTEN_TYPES.SYSTEM, {
      event: 'connecting'
    }, () => {
      console.log("Realtime attempting to reconnect");
      setIsReconnecting(true);
    }).subscribe(status => {
      console.log(`Connection status channel subscription status: ${status}`);
      // Use string comparison since status is a string value
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        setIsReconnecting(false);
      }
    });

    // Heartbeat para verificar conexión periódicamente
    const heartbeatInterval = setInterval(() => {
      if (channel && !isReconnecting) {
        // Sending a tiny ping through the channel to verify connection
        channel.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: {
            timestamp: Date.now()
          }
        }).then(() => {
          setIsConnected(true);
        }).catch(() => {
          setIsConnected(false);
        });
      }
    }, 30000); // Cada 30 segundos

    return () => {
      clearInterval(heartbeatInterval);
      supabase.removeChannel(channel);
    };
  }, [isReconnecting]);

  // For minimal variant (icon only)
  if (variant === "minimal") {
    return <div className={cn("flex items-center justify-center rounded-full p-0.5 transition-colors", isConnected ? "text-green-500" : isReconnecting ? "text-amber-500 animate-pulse" : "text-red-500", className)} title={isConnected ? "Conectado" : isReconnecting ? "Reconectando..." : "Desconectado"}>
        {isConnected ? <Wifi className="h-3 w-3" /> : isReconnecting ? <Wifi className="h-3 w-3 animate-pulse" /> : <WifiOff className="h-3 w-3" />}
      </div>;
  }

  // Default variant with text
  return <div className={cn("flex items-center gap-1.5 text-xs font-medium", className)}>
      <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500" : isReconnecting ? "bg-amber-500 animate-pulse" : "bg-red-500")} />
      
      {isConnected ? <span className="text-zinc-200">Conectado</span> : isReconnecting ? <span className="text-amber-600 animate-pulse">Reconectando...</span> : <span className="text-red-600">Desconectado</span>}
    </div>;
};
export default ConnectionStatusIndicator;