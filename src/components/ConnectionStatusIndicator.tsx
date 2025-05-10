
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
    const channel = supabase.channel('connection-status');

    // Listen to connection status changes
    const subscription = channel
      .on('system', {
        event: 'connected'
      }, () => {
        setIsConnected(true);
        setIsReconnecting(false);
      })
      .on('system', {
        event: 'disconnected'
      }, () => {
        setIsConnected(false);
        setIsReconnecting(false);
      })
      .on('system', {
        event: 'connecting'
      }, () => {
        setIsReconnecting(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // For minimal variant (icon only)
  if (variant === "minimal") {
    return (
      <div 
        className={cn(
          "flex items-center justify-center rounded-full p-0.5 transition-colors",
          isConnected ? "text-green-500" : isReconnecting ? "text-amber-500 animate-pulse" : "text-red-500",
          className
        )} 
        title={isConnected ? "Conectado" : isReconnecting ? "Reconectando..." : "Desconectado"}
      >
        {isConnected ? (
          <Wifi className="h-3 w-3" />
        ) : isReconnecting ? (
          <Wifi className="h-3 w-3 animate-pulse" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
      </div>
    );
  }

  // Default variant with text
  return (
    <div className={cn("flex items-center gap-1.5 text-xs font-medium", className)}>
      <div className={cn(
        "w-2 h-2 rounded-full",
        isConnected ? "bg-green-500" : isReconnecting ? "bg-amber-500 animate-pulse" : "bg-red-500"
      )} />
      
      {isConnected ? (
        <span className="text-green-600">Conectado</span>
      ) : isReconnecting ? (
        <span className="text-amber-600 animate-pulse">Reconectando...</span>
      ) : (
        <span className="text-red-600">Desconectado</span>
      )}
    </div>
  );
};

export default ConnectionStatusIndicator;
