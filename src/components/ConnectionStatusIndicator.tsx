
import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
    // Set up listeners for real-time connection status
    const connectChannel = supabase.channel('connection-status-connect');
    const disconnectChannel = supabase.channel('connection-status-disconnect');
    const reconnectChannel = supabase.channel('connection-status-reconnect');

    // Listen to connection status changes
    connectChannel.on('system', {
      event: 'connected'
    }, () => {
      setIsConnected(true);
      setIsReconnecting(false);
    }).subscribe();

    disconnectChannel.on('system', {
      event: 'disconnected'
    }, () => {
      setIsConnected(false);
      setIsReconnecting(false);
    }).subscribe();

    reconnectChannel.on('system', {
      event: 'connecting'
    }, () => {
      setIsReconnecting(true);
    }).subscribe();

    return () => {
      supabase.removeChannel(connectChannel);
      supabase.removeChannel(disconnectChannel);
      supabase.removeChannel(reconnectChannel);
    };
  }, []);

  // For minimal variant (icon only)
  if (variant === "minimal") {
    return <div className={cn("flex items-center justify-center rounded-full p-0.5 transition-colors", isConnected ? "text-green-500" : isReconnecting ? "text-amber-500 animate-pulse" : "text-red-500", className)} title={isConnected ? "Conectado" : isReconnecting ? "Reconectando..." : "Desconectado"}>
        {isConnected ? <Wifi className="h-3 w-3" /> : isReconnecting ? <Wifi className="h-3 w-3 animate-pulse" /> : <WifiOff className="h-3 w-3" />}
      </div>;
  }

  // Default variant with text
  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)}>
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3 text-green-500" />
          <span className="text-green-600">Conectado</span>
        </>
      ) : isReconnecting ? (
        <>
          <Wifi className="h-3 w-3 text-amber-500 animate-pulse" />
          <span className="text-amber-600">Reconectando...</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 text-red-500" />
          <span className="text-red-600">Desconectado</span>
        </>
      )}
    </div>
  );
};

export default ConnectionStatusIndicator;
