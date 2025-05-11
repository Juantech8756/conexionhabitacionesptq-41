
import { useState, useEffect } from "react";
import { Wifi, WifiOff, Activity, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { REALTIME_LISTEN_TYPES } from "@supabase/supabase-js";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ConnectionStatusIndicatorProps {
  className?: string;
  variant?: "default" | "minimal" | "detailed";
  showUsage?: boolean;
}

const ConnectionStatusIndicator = ({
  className,
  variant = "default",
  showUsage = false
}: ConnectionStatusIndicatorProps) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  
  useEffect(() => {
    // Set up a dedicated channel just for monitoring connection status
    const channel = supabase.channel('system-connection-status');

    // Listen to connection status changes
    const subscription = channel
      .on(REALTIME_LISTEN_TYPES.SYSTEM, { event: 'connected' }, () => {
        console.log("Realtime connection established");
        setIsConnected(true);
        setIsReconnecting(false);
        setLastActivity(new Date());
      })
      .on(REALTIME_LISTEN_TYPES.SYSTEM, { event: 'disconnected' }, () => {
        console.log("Realtime connection lost");
        setIsConnected(false);
        setIsReconnecting(false);
      })
      .on(REALTIME_LISTEN_TYPES.SYSTEM, { event: 'connecting' }, () => {
        console.log("Realtime attempting to reconnect");
        setIsReconnecting(true);
      })
      .subscribe(status => {
        console.log(`Connection status channel subscription status: ${status}`);
        // Use string comparison since status is a string value
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setIsReconnecting(false);
          setLastActivity(new Date());
        }
      });

    // Periodic ping to measure latency
    const pingInterval = setInterval(() => {
      if (isConnected && !isReconnecting) {
        const startTime = Date.now();
        
        // Send a tiny ping through the channel to measure latency
        channel.send({
          type: 'broadcast',
          event: 'ping',
          payload: { timestamp: startTime }
        }).then(() => {
          const endTime = Date.now();
          const latency = endTime - startTime;
          setPingLatency(latency);
          setLastActivity(new Date());
          setIsConnected(true);
        }).catch(() => {
          setIsConnected(false);
          setPingLatency(null);
        });
      }
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(pingInterval);
      supabase.removeChannel(channel);
    };
  }, [isReconnecting]);

  // Format the last activity time
  const getLastActivityText = () => {
    if (!lastActivity) return "Sin actividad";
    
    const minutes = Math.floor((Date.now() - lastActivity.getTime()) / 60000);
    
    if (minutes < 1) return "Ahora mismo";
    if (minutes < 60) return `Hace ${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    
    return lastActivity.toLocaleDateString();
  };

  // For minimal variant (icon only)
  if (variant === "minimal") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={cn(
                "flex items-center justify-center rounded-full p-0.5 transition-colors", 
                isConnected ? 
                  "text-green-500" : 
                  isReconnecting ? 
                    "text-amber-500 animate-pulse" : 
                    "text-red-500", 
                className
              )} 
            >
              {isConnected ? (
                <Wifi className="h-3 w-3" />
              ) : isReconnecting ? (
                <Wifi className="h-3 w-3 animate-pulse" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isConnected ? 
                "Conectado" : 
                isReconnecting ? 
                  "Reconectando..." : 
                  "Desconectado"}
            </p>
            {lastActivity && <p className="text-xs text-muted-foreground">Última actividad: {getLastActivityText()}</p>}
            {pingLatency && <p className="text-xs text-muted-foreground">Latencia: {pingLatency}ms</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Detailed variant with more information
  if (variant === "detailed") {
    return (
      <div className={cn("border rounded-md p-3 space-y-2", className)}>
        <div className="flex items-center justify-between">
          <span className="font-medium">Estado de conexión</span>
          <div className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full",
            isConnected ? "bg-green-100 text-green-800" : 
            isReconnecting ? "bg-amber-100 text-amber-800 animate-pulse" : 
            "bg-red-100 text-red-800"
          )}>
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                <span>Conectado</span>
              </>
            ) : isReconnecting ? (
              <>
                <Activity className="h-3 w-3 animate-pulse" />
                <span>Reconectando...</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span>Desconectado</span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Última actividad:</span>
            <p className="font-medium">{getLastActivityText()}</p>
          </div>
          
          <div>
            <span className="text-muted-foreground">Latencia:</span>
            <p className="font-medium">{pingLatency ? `${pingLatency}ms` : "N/A"}</p>
          </div>
        </div>

        {showUsage && (
          <div className="pt-2 border-t text-xs text-muted-foreground">
            <div className="flex justify-between items-center">
              <span>Plan Pro: 100 conexiones</span>
              <span className="font-medium">32% usado</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div 
                className="bg-green-500 h-1.5 rounded-full" 
                style={{ width: "32%" }} 
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default variant with text
  return (
    <div className={cn("flex items-center gap-1.5 text-xs font-medium", className)}>
      <div className={cn(
        "w-2 h-2 rounded-full", 
        isConnected ? 
          "bg-green-500" : 
          isReconnecting ? 
            "bg-amber-500 animate-pulse" : 
            "bg-red-500")
      } />
      
      {isConnected ? (
        <span className="text-zinc-200">Conectado</span>
      ) : isReconnecting ? (
        <span className="text-amber-600 animate-pulse">Reconectando...</span>
      ) : (
        <span className="text-red-600">Desconectado</span>
      )}
      
      {lastActivity && variant === "default" && (
        <span className="text-muted-foreground ml-1">({getLastActivityText()})</span>
      )}
    </div>
  );
};

export default ConnectionStatusIndicator;
