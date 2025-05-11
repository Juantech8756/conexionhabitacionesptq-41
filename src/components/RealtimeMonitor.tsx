
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircleIcon, CheckCircleIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Type for realtime connection data
interface RealtimeConnectionData {
  channelId: string;
  status: string;
  subscriptions: number;
  lastActivity: Date;
  type: 'guest' | 'reception' | 'unknown';
}

export const RealtimeMonitor = () => {
  const [connections, setConnections] = useState<RealtimeConnectionData[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'reception' | 'guests'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Mock function to fetch connection data
  // In a real implementation, this would use an admin API or edge function
  const fetchConnections = async () => {
    setIsRefreshing(true);
    // This is a placeholder for demonstration
    // In a real implementation, you'd call a Supabase edge function
    // that would use admin privileges to check active connections
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data for demonstration
      const mockData: RealtimeConnectionData[] = [
        {
          channelId: 'realtime-12345-reception',
          status: 'connected',
          subscriptions: 5,
          lastActivity: new Date(),
          type: 'reception'
        },
        {
          channelId: 'realtime-67890-guest',
          status: 'connected',
          subscriptions: 2,
          lastActivity: new Date(Date.now() - 5 * 60000), // 5 minutes ago
          type: 'guest'
        },
        {
          channelId: 'realtime-54321-guest',
          status: 'disconnected',
          subscriptions: 0,
          lastActivity: new Date(Date.now() - 30 * 60000), // 30 minutes ago
          type: 'guest'
        }
      ];
      
      setConnections(mockData);
    } catch (error) {
      console.error("Error fetching realtime connections:", error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    fetchConnections();
    
    // Periodically refresh the data
    const interval = setInterval(() => {
      fetchConnections();
    }, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, []);
  
  // Filter connections based on active tab
  const filteredConnections = connections.filter(conn => {
    if (activeTab === 'all') return true;
    return conn.type === activeTab;
  });
  
  // Calculate summary stats
  const connectedCount = connections.filter(conn => conn.status === 'connected').length;
  const totalSubscriptions = connections.reduce((sum, conn) => sum + conn.subscriptions, 0);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Monitor de Conexiones Realtime
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchConnections}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
        <CardDescription>
          {connectedCount} conexiones activas, {totalSubscriptions} suscripciones totales
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="reception">Recepción</TabsTrigger>
            <TabsTrigger value="guests">Huéspedes</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab}>
            <div className="space-y-4">
              {filteredConnections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay conexiones {activeTab !== 'all' ? `de ${activeTab}` : ''} para mostrar
                </div>
              ) : (
                filteredConnections.map((conn, index) => (
                  <div key={index} className="border rounded-md p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={conn.status === 'connected' ? 'default' : 'destructive'}>
                          {conn.status === 'connected' ? (
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                          ) : (
                            <AlertCircleIcon className="h-3 w-3 mr-1" />
                          )}
                          {conn.status}
                        </Badge>
                        <span className="font-medium">{conn.channelId}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <span>{conn.subscriptions} suscripciones</span>
                        <span className="mx-2">•</span>
                        <span>Última actividad: {formatTimeAgo(conn.lastActivity)}</span>
                      </div>
                    </div>
                    <Badge variant="outline">{conn.type}</Badge>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Helper function to format time ago
const formatTimeAgo = (date: Date): string => {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  
  if (minutes < 1) return "Ahora mismo";
  if (minutes < 60) return `Hace ${minutes} minutos`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} horas`;
  
  return date.toLocaleDateString();
};

export default RealtimeMonitor;
