import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon, Clock, MessageSquare, Bell, Users, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useRealtime } from "@/hooks/use-realtime";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
type ResponseStat = {
  guest_id: string;
  guest_name: string;
  room_number: string;
  total_messages: number;
  avg_response_time: number | null;
  max_response_time: number | null;
  pending_messages: number | null;
  wait_time_minutes: number | null;
};
const DashboardStats = () => {
  const [stats, setStats] = useState<ResponseStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const {
    toast
  } = useToast();
  const [summary, setSummary] = useState({
    totalGuests: 0,
    totalMessages: 0,
    pendingMessages: 0,
    avgResponseTime: 0
  });
  const fetchStats = async () => {
    setIsRefreshing(true);
    try {
      // Get statistics from view
      const {
        data: responseStats,
        error: responseError
      } = await supabase.from("response_statistics").select("*");
      if (responseError) throw responseError;
      setStats(responseStats || []);

      // Calculate summary statistics
      if (responseStats && responseStats.length > 0) {
        const totalGuests = responseStats.length;
        const totalMessages = responseStats.reduce((sum, stat) => sum + (stat.total_messages || 0), 0);
        const pendingMessages = responseStats.reduce((sum, stat) => sum + (stat.pending_messages || 0), 0);

        // Calculate average response time from non-null values
        const validResponseTimes = responseStats.filter(stat => stat.avg_response_time !== null).map(stat => stat.avg_response_time || 0);
        const avgResponseTime = validResponseTimes.length > 0 ? validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length : 0;
        setSummary({
          totalGuests,
          totalMessages,
          pendingMessages,
          avgResponseTime
        });
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching statistics:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial fetch and setup real-time subscriptions
  useEffect(() => {
    fetchStats();
  }, [toast]);

  // Set up real-time subscriptions with our custom hook
  const {
    isConnected
  } = useRealtime([{
    table: "messages",
    event: "*",
    callback: () => fetchStats()
  }, {
    table: "guests",
    event: "*",
    callback: () => fetchStats()
  }], "dashboard-stats-realtime");

  // Handle manual refresh
  const handleRefresh = () => {
    fetchStats();
  };

  // Prepare data for chart
  const chartData = stats.filter(stat => stat.avg_response_time !== null).map(stat => ({
    name: `${stat.guest_name} (${stat.room_number})`,
    avg: Math.round(stat.avg_response_time || 0),
    max: stat.max_response_time || 0
  })).sort((a, b) => b.max - a.max).slice(0, 10); // Top 10

  // Format time in minutes:seconds
  const formatResponseTime = (seconds: number | null) => {
    if (seconds === null) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Format last updated time
  const formatLastUpdated = () => {
    return lastUpdated.toLocaleTimeString();
  };
  return <div className="container mx-auto p-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
        <h2 className="text-2xl font-bold">Estadísticas del Sistema</h2>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:justify-end">
          <div className="text-xs text-gray-500 order-2 sm:order-1 flex items-center">
            <span className="mr-1">Actualizado:</span>
            {formatLastUpdated()}
          </div>
          
          <ConnectionStatusIndicator className="order-1 sm:order-2" />
          
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-1 ml-auto sm:ml-0 order-3 py-[7px] px-[27px] my-[13px] mx-[102px]">
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AnimatePresence mode="wait">
          <motion.div key={`card-guests-${summary.totalGuests}`} initial={{
          opacity: 0.8,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} transition={{
          duration: 0.2
        }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Huéspedes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalGuests}</div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div key={`card-messages-${summary.totalMessages}`} initial={{
          opacity: 0.8,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} transition={{
          duration: 0.2,
          delay: 0.05
        }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Mensajes</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalMessages}</div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div key={`card-pending-${summary.pendingMessages}`} initial={{
          opacity: 0.8,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} transition={{
          duration: 0.2,
          delay: 0.1
        }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Mensajes Pendientes</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.pendingMessages}</div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div key={`card-time-${Math.round(summary.avgResponseTime)}`} initial={{
          opacity: 0.8,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} transition={{
          duration: 0.2,
          delay: 0.15
        }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatResponseTime(summary.avgResponseTime)}
                </div>
                <p className="text-xs text-muted-foreground">
                  minutos:segundos
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChartIcon className="h-5 w-5" />
              Tiempos de Respuesta
            </CardTitle>
            <CardDescription>
              Tiempo promedio y máximo de respuesta por huésped (segundos)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {chartData.length > 0 ? <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 60
            }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{
                fontSize: 12
              }} />
                  <YAxis />
                  <Tooltip formatter={value => [`${value} seg`]} />
                  <Bar name="Tiempo Promedio" dataKey="avg" fill="#4f46e5" />
                  <Bar name="Tiempo Máximo" dataKey="max" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer> : <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">{isLoading ? "Cargando datos..." : "No hay datos suficientes"}</p>
              </div>}
          </CardContent>
        </Card>
        
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Mensajes Sin Responder
            </CardTitle>
            <CardDescription>
              Huéspedes con mensajes pendientes
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden p-0">
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Huésped</TableHead>
                    <TableHead>Hab.</TableHead>
                    <TableHead className="text-right">Pendientes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        <div className="flex items-center justify-center py-2">
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          <span>Cargando...</span>
                        </div>
                      </TableCell>
                    </TableRow> : stats.filter(s => (s.pending_messages || 0) > 0).length === 0 ? <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        No hay mensajes pendientes
                      </TableCell>
                    </TableRow> : <AnimatePresence>
                      {stats.filter(stat => (stat.pending_messages || 0) > 0).sort((a, b) => (b.pending_messages || 0) - (a.pending_messages || 0)).map(stat => <motion.tr key={stat.guest_id} initial={{
                    opacity: 0,
                    y: 5
                  }} animate={{
                    opacity: 1,
                    y: 0
                  }} exit={{
                    opacity: 0
                  }} transition={{
                    duration: 0.2
                  }} className="group hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {stat.guest_name}
                            </TableCell>
                            <TableCell>
                              {stat.room_number}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              <span className="inline-flex items-center justify-center bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">
                                {stat.pending_messages}
                              </span>
                            </TableCell>
                          </motion.tr>)}
                    </AnimatePresence>}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default DashboardStats;