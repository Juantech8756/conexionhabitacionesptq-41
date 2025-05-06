
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart as BarChartIcon,
  Clock,
  MessageSquare,
  Bell,
  Users,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
  const { toast } = useToast();
  
  const [summary, setSummary] = useState({
    totalGuests: 0,
    totalMessages: 0,
    pendingMessages: 0,
    avgResponseTime: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Get statistics from view
        const { data: responseStats, error: responseError } = await supabase
          .from("response_statistics")
          .select("*");

        if (responseError) throw responseError;

        setStats(responseStats || []);

        // Calculate summary statistics
        if (responseStats && responseStats.length > 0) {
          const totalGuests = responseStats.length;
          const totalMessages = responseStats.reduce(
            (sum, stat) => sum + (stat.total_messages || 0),
            0
          );
          const pendingMessages = responseStats.reduce(
            (sum, stat) => sum + (stat.pending_messages || 0),
            0
          );
          
          // Calculate average response time from non-null values
          const validResponseTimes = responseStats
            .filter(stat => stat.avg_response_time !== null)
            .map(stat => stat.avg_response_time || 0);
          
          const avgResponseTime = validResponseTimes.length > 0
            ? validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length
            : 0;

          setSummary({
            totalGuests,
            totalMessages,
            pendingMessages,
            avgResponseTime,
          });
        }
      } catch (error) {
        console.error("Error fetching statistics:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las estadísticas",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [toast]);

  // Prepare data for chart
  const chartData = stats
    .filter(stat => stat.avg_response_time !== null)
    .map(stat => ({
      name: `${stat.guest_name} (${stat.room_number})`,
      avg: Math.round(stat.avg_response_time || 0),
      max: stat.max_response_time || 0
    }))
    .sort((a, b) => b.max - a.max)
    .slice(0, 10); // Top 10

  // Format time in minutes:seconds
  const formatResponseTime = (seconds: number | null) => {
    if (seconds === null) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="container mx-auto p-4 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-6">Estadísticas del Sistema</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Huéspedes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalGuests}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Mensajes</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalMessages}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mensajes Pendientes</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pendingMessages}</div>
          </CardContent>
        </Card>
        
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
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{fontSize: 12}}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} seg`]} />
                  <Bar name="Tiempo Promedio" dataKey="avg" fill="#4f46e5" />
                  <Bar name="Tiempo Máximo" dataKey="max" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">No hay datos suficientes</p>
              </div>
            )}
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
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : stats.filter(s => (s.pending_messages || 0) > 0).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        No hay mensajes pendientes
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats
                      .filter(stat => (stat.pending_messages || 0) > 0)
                      .sort((a, b) => (b.pending_messages || 0) - (a.pending_messages || 0))
                      .map((stat) => (
                        <TableRow key={stat.guest_id}>
                          <TableCell>
                            {stat.guest_name}
                          </TableCell>
                          <TableCell>
                            {stat.room_number}
                          </TableCell>
                          <TableCell className="text-right">
                            {stat.pending_messages}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardStats;
