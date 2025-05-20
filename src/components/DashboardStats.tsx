import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon, Clock, MessageSquare, Bell, Users, RefreshCw, Calendar, TrendingUp, TrendingDown, Activity, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useRealtime } from "@/hooks/use-realtime";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import EnhancedStatsCharts from "./dashboard/EnhancedStatsCharts";
import EnhancedRoomManagement from "./dashboard/EnhancedRoomManagement";
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
type DailyActivityStat = {
  date: string;
  message_count: number;
  unique_guests: number;
};
type RoomActivityStat = {
  room_number: string;
  message_count: number;
  guest_count: number;
  last_activity: string;
};
const COLORS = ['#8B5CF6', '#D946EF', '#F97316', '#0EA5E9', '#6E59A5', '#10B981'];
const DashboardStats = () => {
  const [stats, setStats] = useState<ResponseStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [dailyActivity, setDailyActivity] = useState<DailyActivityStat[]>([]);
  const [roomActivity, setRoomActivity] = useState<RoomActivityStat[]>([]);
  const [activeGuests, setActiveGuests] = useState<number>(0);
  const [inactiveGuests, setInactiveGuests] = useState<number>(0);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const {
    toast
  } = useToast();
  const [summary, setSummary] = useState({
    totalGuests: 0,
    totalMessages: 0,
    pendingMessages: 0,
    avgResponseTime: 0,
    activeRooms: 0,
    guestsToday: 0,
    messagesPerGuest: 0,
    responseRate: 0
  });

  // Fetch all dashboard statistics
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

        // Count active rooms (with recent activity in the last 24h)
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Get daily guest activity
        const {
          data: todayGuests
        } = await supabase.from('guests').select('id').gte('created_at', yesterday.toISOString());

        // Calculate messages per guest
        const messagesPerGuest = totalGuests > 0 ? totalMessages / totalGuests : 0;

        // Calculate response rate (replied messages / total messages)
        const repliedMessages = responseStats.reduce((sum, stat) => sum + (stat.total_messages - (stat.pending_messages || 0)), 0);
        const responseRate = totalMessages > 0 ? repliedMessages / totalMessages * 100 : 0;
        setSummary({
          totalGuests,
          totalMessages,
          pendingMessages,
          avgResponseTime,
          activeRooms: responseStats.filter(stat => stat.wait_time_minutes === 0).length,
          guestsToday: todayGuests?.length || 0,
          messagesPerGuest,
          responseRate
        });
      }

      // Fetch daily activity
      await fetchDailyActivity();

      // Fetch room activity
      await fetchRoomActivity();

      // Fetch guest activity stats
      await fetchGuestActivityStats();
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

  // Fetch daily activity stats
  const fetchDailyActivity = async () => {
    try {
      let rangeDate;
      const now = new Date();
      switch (timeRange) {
        case 'week':
          rangeDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          rangeDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          rangeDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      // Get message counts by day
      const {
        data: messagesByDay,
        error: messagesError
      } = await supabase.from('messages').select('created_at, guest_id').gte('created_at', rangeDate.toISOString());
      if (messagesError) throw messagesError;
      const dailyStats: Record<string, DailyActivityStat> = {};
      if (messagesByDay) {
        messagesByDay.forEach(msg => {
          const date = new Date(msg.created_at);
          const dateKey = format(date, 'yyyy-MM-dd');
          if (!dailyStats[dateKey]) {
            dailyStats[dateKey] = {
              date: format(date, 'd MMM', {
                locale: es
              }),
              message_count: 0,
              unique_guests: 0
            };
          }
          dailyStats[dateKey].message_count++;

          // Track unique guests per day
          const guestSet = new Set<string>();
          messagesByDay.filter(m => format(new Date(m.created_at), 'yyyy-MM-dd') === dateKey).forEach(m => guestSet.add(m.guest_id));
          dailyStats[dateKey].unique_guests = guestSet.size;
        });
      }

      // Convert to array and sort by date
      const activityArray = Object.values(dailyStats).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setDailyActivity(activityArray);
    } catch (error) {
      console.error("Error fetching daily activity:", error);
    }
  };

  // Fetch room activity
  const fetchRoomActivity = async () => {
    try {
      // Get room activity data
      const {
        data: rooms,
        error: roomsError
      } = await supabase.from('rooms').select('room_number, id');
      if (roomsError) throw roomsError;
      if (!rooms) return;
      const roomsMap = rooms.reduce((acc, room) => {
        acc[room.id] = room.room_number;
        return acc;
      }, {} as Record<string, string>);

      // Get guest counts and messages by room
      const {
        data: guests,
        error: guestsError
      } = await supabase.from('guests').select('room_id, room_number, id');
      if (guestsError) throw guestsError;
      if (!guests) return;

      // Get message counts
      const {
        data: messages,
        error: messagesError
      } = await supabase.from('messages').select('guest_id, created_at');
      if (messagesError) throw messagesError;
      const roomStats: Record<string, RoomActivityStat> = {};

      // Build room stats
      guests.forEach(guest => {
        const roomNumber = guest.room_number || (guest.room_id ? roomsMap[guest.room_id] : 'Unknown');
        if (!roomNumber) return;
        if (!roomStats[roomNumber]) {
          roomStats[roomNumber] = {
            room_number: roomNumber,
            guest_count: 0,
            message_count: 0,
            last_activity: ''
          };
        }
        roomStats[roomNumber].guest_count++;

        // Count messages for this guest
        const guestMessages = messages?.filter(msg => msg.guest_id === guest.id) || [];
        roomStats[roomNumber].message_count += guestMessages.length;

        // Track last activity
        if (guestMessages.length > 0) {
          const lastMsgDate = new Date(Math.max(...guestMessages.map(msg => new Date(msg.created_at).getTime())));
          if (!roomStats[roomNumber].last_activity || new Date(roomStats[roomNumber].last_activity) < lastMsgDate) {
            roomStats[roomNumber].last_activity = lastMsgDate.toISOString();
          }
        }
      });

      // Convert to array and sort by message count
      const roomActivityArray = Object.values(roomStats).sort((a, b) => b.message_count - a.message_count);
      setRoomActivity(roomActivityArray);
    } catch (error) {
      console.error("Error fetching room activity:", error);
    }
  };

  // Fetch guest activity stats
  const fetchGuestActivityStats = async () => {
    try {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Count active guests (with messages in last 24h)
      const {
        data: activeGuestsData,
        error: activeError
      } = await supabase.from('messages').select('guest_id').gte('created_at', dayAgo.toISOString());
      if (activeError) throw activeError;
      const activeGuestIds = new Set();
      activeGuestsData?.forEach(msg => activeGuestIds.add(msg.guest_id));

      // Get total guest count
      const {
        count: totalCount,
        error: countError
      } = await supabase.from('guests').select('*', {
        count: 'exact',
        head: true
      });
      if (countError) throw countError;
      setActiveGuests(activeGuestIds.size);
      setInactiveGuests((totalCount || 0) - activeGuestIds.size);
    } catch (error) {
      console.error("Error fetching guest activity stats:", error);
    }
  };

  // Initial fetch and setup real-time subscriptions
  useEffect(() => {
    fetchStats();
  }, [toast, timeRange]);

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

  // Handle time range change
  const handleTimeRangeChange = (range: 'day' | 'week' | 'month') => {
    setTimeRange(range);
  };

  // Prepare data for chart
  const chartData = stats.filter(stat => stat.avg_response_time !== null).map(stat => ({
    name: `${stat.guest_name} (${stat.room_number})`,
    avg: Math.round(stat.avg_response_time || 0),
    max: stat.max_response_time || 0
  })).sort((a, b) => b.max - a.max).slice(0, 10); // Top 10

  // Prepare pie chart data
  const guestActivityData = [{
    name: 'Activos',
    value: activeGuests
  }, {
    name: 'Inactivos',
    value: inactiveGuests
  }];

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

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  // Format wait time in minutes (rounded to whole number)
  const formatWaitTime = (minutes: number | null): number => {
    if (minutes === null || minutes === 0) return 0;
    return Math.round(minutes);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Panel de Estadísticas</h1>
          <p className="text-muted-foreground">
            Última actualización: {formatLastUpdated()}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          {isRefreshing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Actualizar
        </Button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Huéspedes registrados
                </p>
                <h3 className="text-2xl font-bold mt-1">{summary.totalGuests}</h3>
              </div>
              <div className="p-2 bg-primary-foreground/20 rounded-full">
                <User className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {summary.guestsToday} nuevos hoy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total de mensajes
                </p>
                <h3 className="text-2xl font-bold mt-1">{summary.totalMessages}</h3>
              </div>
              <div className="p-2 bg-primary-foreground/20 rounded-full">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {formatPercentage(summary.responseRate)}% tasa de respuesta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Tiempo de respuesta
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  {formatResponseTime(summary.avgResponseTime)}
                </h3>
              </div>
              <div className="p-2 bg-primary-foreground/20 rounded-full">
                <Clock className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Promedio en el último mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Habitaciones activas
                </p>
                <h3 className="text-2xl font-bold mt-1">
                  {summary.activeRooms}/{roomActivity.length}
                </h3>
              </div>
              <div className="p-2 bg-primary-foreground/20 rounded-full">
                <BarChartIcon className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {summary.pendingMessages} mensajes pendientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos mejorados */}
      <div className="mb-8">
        <EnhancedStatsCharts
          dailyActivity={dailyActivity}
          roomActivity={roomActivity}
          activeGuests={activeGuests}
          inactiveGuests={inactiveGuests}
          totalMessages={summary.totalMessages}
          pendingMessages={summary.pendingMessages}
          responseRate={summary.responseRate}
        />
      </div>

      {/* Gestión de habitaciones mejorada */}
      <div className="mb-8">
        <EnhancedRoomManagement showGuestCount={true} />
      </div>

      {/* Tabla de tiempos de respuesta */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Tiempos de respuesta por huésped</CardTitle>
          <CardDescription>
            Estadísticas detalladas de tiempos de respuesta a mensajes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Huésped</TableHead>
                  <TableHead>Habitación</TableHead>
                  <TableHead>Mensajes</TableHead>
                  <TableHead>Tiempo de respuesta</TableHead>
                  <TableHead>Tiempo máximo</TableHead>
                  <TableHead>Pendientes</TableHead>
                  <TableHead>Espera actual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => (
                  <TableRow key={stat.guest_id}>
                    <TableCell className="font-medium">
                      {stat.guest_name}
                    </TableCell>
                    <TableCell>{stat.room_number}</TableCell>
                    <TableCell>{stat.total_messages}</TableCell>
                    <TableCell>
                      {formatResponseTime(stat.avg_response_time)}
                    </TableCell>
                    <TableCell>
                      {formatResponseTime(stat.max_response_time)}
                    </TableCell>
                    <TableCell>{stat.pending_messages || 0}</TableCell>
                    <TableCell>
                      {formatWaitTime(stat.wait_time_minutes)} min
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Controles */}
      <div className="flex space-x-4 mb-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Rango de tiempo</p>
          <div className="flex space-x-2">
            <Button
              variant={timeRange === "day" ? "default" : "outline"}
              size="sm"
              onClick={() => handleTimeRangeChange("day")}
            >
              24h
            </Button>
            <Button
              variant={timeRange === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => handleTimeRangeChange("week")}
            >
              7 días
            </Button>
            <Button
              variant={timeRange === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => handleTimeRangeChange("month")}
            >
              30 días
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;