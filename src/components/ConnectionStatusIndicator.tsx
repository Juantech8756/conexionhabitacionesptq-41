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
    const subscription = channel.on('system', {
      event: 'connected'
    }, () => {
      setIsConnected(true);
      setIsReconnecting(false);
    }).on('system', {
      event: 'disconnected'
    }, () => {
      setIsConnected(false);
      setIsReconnecting(false);
    }).on('system', {
      event: 'connecting'
    }, () => {
      setIsReconnecting(true);
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // For minimal variant (icon only)
  if (variant === "minimal") {
    return <div className={cn("flex items-center justify-center rounded-full p-0.5 transition-colors", isConnected ? "text-green-500" : isReconnecting ? "text-amber-500 animate-pulse" : "text-red-500", className)} title={isConnected ? "Conectado" : isReconnecting ? "Reconectando..." : "Desconectado"}>
        {isConnected ? <Wifi className="h-3 w-3" /> : isReconnecting ? <Wifi className="h-3 w-3 animate-pulse" /> : <WifiOff className="h-3 w-3" />}
      </div>;
  }

  // Default variant with text
  return;
};
export default ConnectionStatusIndicator;