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
  return <div className="container mx-auto p-1 sm:p-2 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 sm:mb-3 gap-1">
        <h2 className="text-lg sm:text-xl font-bold text-hotel-800">Estadísticas del Sistema</h2>
        
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 sm:justify-end">
          <div className="text-xs text-gray-500 order-2 sm:order-1 flex items-center">
            <span className="mr-1">Actualizado:</span>
            {formatLastUpdated()}
          </div>
          
          <ConnectionStatusIndicator className="order-1 sm:order-2 text-gray-700" />
          
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-1 ml-auto sm:ml-0 order-3 h-7 text-xs">
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </Button>
        </div>
      </div>
      
      {/* Main stats cards - 2 rows of 4 on desktop, stacked on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-3">
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
            <Card className="overflow-hidden bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 pt-3 px-3 sm:pt-4 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Huéspedes</CardTitle>
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-hotel-700" />
              </CardHeader>
              <CardContent className="pb-3 px-3 sm:pb-4 sm:px-4">
                <div className="text-lg sm:text-2xl font-bold text-hotel-800">{summary.totalGuests}</div>
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
            <Card className="overflow-hidden bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 pt-3 px-3 sm:pt-4 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Mensajes</CardTitle>
                <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-hotel-700" />
              </CardHeader>
              <CardContent className="pb-3 px-3 sm:pb-4 sm:px-4">
                <div className="text-lg sm:text-2xl font-bold text-hotel-800">{summary.totalMessages}</div>
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
            <Card className="overflow-hidden bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 pt-3 px-3 sm:pt-4 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Mensajes Pendientes</CardTitle>
                <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-hotel-700" />
              </CardHeader>
              <CardContent className="pb-3 px-3 sm:pb-4 sm:px-4">
                <div className="text-lg sm:text-2xl font-bold text-hotel-800">{summary.pendingMessages}</div>
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
            <Card className="overflow-hidden bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 pt-3 px-3 sm:pt-4 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Tiempo Promedio</CardTitle>
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-hotel-700" />
              </CardHeader>
              <CardContent className="pb-3 px-3 sm:pb-4 sm:px-4">
                <div className="text-lg sm:text-2xl font-bold text-hotel-800">
                  {formatResponseTime(summary.avgResponseTime)}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  minutos:segundos
                </p>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Segunda fila de estadísticas */}
          <motion.div key={`card-active-rooms-${summary.activeRooms}`} initial={{
          opacity: 0.8,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} transition={{
          duration: 0.2,
          delay: 0.2
        }}>
            <Card className="overflow-hidden bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 pt-3 px-3 sm:pt-4 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Cabañas Activas</CardTitle>
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-hotel-700" />
              </CardHeader>
              <CardContent className="pb-3 px-3 sm:pb-4 sm:px-4">
                <div className="text-lg sm:text-2xl font-bold text-hotel-800">{summary.activeRooms}</div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div key={`card-guests-today-${summary.guestsToday}`} initial={{
          opacity: 0.8,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} transition={{
          duration: 0.2,
          delay: 0.25
        }}>
            <Card className="overflow-hidden bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 pt-3 px-3 sm:pt-4 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Huéspedes Hoy</CardTitle>
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-hotel-700" />
              </CardHeader>
              <CardContent className="pb-3 px-3 sm:pb-4 sm:px-4">
                <div className="text-lg sm:text-2xl font-bold text-hotel-800">{summary.guestsToday}</div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div key={`card-msg-per-guest-${Math.round(summary.messagesPerGuest)}`} initial={{
          opacity: 0.8,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} transition={{
          duration: 0.2,
          delay: 0.3
        }}>
            <Card className="overflow-hidden bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 pt-3 px-3 sm:pt-4 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Msgs por Huésped</CardTitle>
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-hotel-700" />
              </CardHeader>
              <CardContent className="pb-3 px-3 sm:pb-4 sm:px-4">
                <div className="text-lg sm:text-2xl font-bold text-hotel-800">{summary.messagesPerGuest.toFixed(1)}</div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div key={`card-response-rate-${Math.round(summary.responseRate)}`} initial={{
          opacity: 0.8,
          scale: 0.95
        }} animate={{
          opacity: 1,
          scale: 1
        }} transition={{
          duration: 0.2,
          delay: 0.35
        }}>
            <Card className="overflow-hidden bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 pt-3 px-3 sm:pt-4 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Tasa de Respuesta</CardTitle>
                <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-hotel-700" />
              </CardHeader>
              <CardContent className="pb-3 px-3 sm:pb-4 sm:px-4">
                <div className="text-lg sm:text-2xl font-bold text-hotel-800">{formatPercentage(summary.responseRate)}</div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Time range selector */}
      <div className="flex justify-between items-center mb-3 bg-hotel-50/50 p-2 rounded-lg">
        <h3 className="text-sm sm:text-base font-semibold text-hotel-800">Actividad por Período</h3>
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant={timeRange === 'day' ? 'default' : 'outline'}
            onClick={() => handleTimeRangeChange('day')}
            className={`text-xs h-7 px-2 sm:h-8 sm:px-3 ${timeRange === 'day' ? 'bg-hotel-700 hover:bg-hotel-800' : ''}`}
          >
            Día
          </Button>
          <Button
            size="sm"
            variant={timeRange === 'week' ? 'default' : 'outline'}
            onClick={() => handleTimeRangeChange('week')}
            className={`text-xs h-7 px-2 sm:h-8 sm:px-3 ${timeRange === 'week' ? 'bg-hotel-700 hover:bg-hotel-800' : ''}`}
          >
            Semana
          </Button>
          <Button
            size="sm"
            variant={timeRange === 'month' ? 'default' : 'outline'}
            onClick={() => handleTimeRangeChange('month')}
            className={`text-xs h-7 px-2 sm:h-8 sm:px-3 ${timeRange === 'month' ? 'bg-hotel-700 hover:bg-hotel-800' : ''}`}
          >
            Mes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-grow">
        {/* Daily Activity Chart */}
        <Card className="lg:col-span-2 bg-white shadow-sm">
          <CardHeader className="p-3">
            <div className="flex flex-wrap items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <BarChartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                Actividad Diaria
              </CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Mensajes y huéspedes activos por día
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-3 h-[200px] sm:h-[240px]">
            {dailyActivity.length > 0 ? <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyActivity} margin={{
              top: 5,
              right: 10,
              left: 0,
              bottom: 25
            }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} tick={{
                fontSize: 10
              }} />
                  <YAxis tick={{
                fontSize: 10
              }} />
                  <Tooltip formatter={value => [value, '']} labelFormatter={label => `Fecha: ${label}`} contentStyle={{
                fontSize: '12px'
              }} />
                  <Bar name="Mensajes" dataKey="message_count" fill="#8B5CF6" />
                  <Bar name="Huéspedes" dataKey="unique_guests" fill="#D946EF" />
                </BarChart>
              </ResponsiveContainer> : <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">
                  {isLoading ? "Cargando datos..." : "No hay datos suficientes"}
                </p>
              </div>}
          </CardContent>
        </Card>

        {/* Guest Activity Pie Chart */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="p-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              Actividad de Huéspedes
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Huéspedes activos en las últimas 24h
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-3 h-[200px] sm:h-[240px]">
            {activeGuests + inactiveGuests > 0 ? <div className="h-full flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={guestActivityData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value" label={({
                  name,
                  percent
                }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {guestActivityData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={value => [value, 'Huéspedes']} />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="flex justify-center gap-4 text-xs">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-[#8B5CF6] rounded-full mr-1"></div>
                    <span>Activos: {activeGuests}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-[#D946EF] rounded-full mr-1"></div>
                    <span>Inactivos: {inactiveGuests}</span>
                  </div>
                </div>
              </div> : <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">
                  {isLoading ? "Cargando datos..." : "No hay datos suficientes"}
                </p>
              </div>}
          </CardContent>
        </Card>
        
        {/* Response Time Chart */}
        <Card className="lg:col-span-2 bg-white shadow-sm">
          <CardHeader className="p-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              Tiempos de Respuesta
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Tiempo promedio y máximo de respuesta por huésped (segundos)
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-3 h-[200px] sm:h-[240px]">
            {chartData.length > 0 ? <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{
              top: 5,
              right: 20,
              left: 0,
              bottom: 60
            }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{
                fontSize: 10
              }} />
                  <YAxis tick={{
                fontSize: 10
              }} />
                  <Tooltip formatter={value => [`${value} seg`, '']} contentStyle={{
                fontSize: '12px'
              }} />
                  <Bar name="Tiempo Promedio" dataKey="avg" fill="#4f46e5" />
                  <Bar name="Tiempo Máximo" dataKey="max" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer> : <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">
                  {isLoading ? "Cargando datos..." : "No hay datos suficientes"}
                </p>
              </div>}
          </CardContent>
        </Card>
        
        {/* Room Activity Table */}
        <Card className="lg:col-span-1 bg-white shadow-sm">
          <CardHeader className="p-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              Actividad por Cabaña
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Mensajes y huéspedes por cabaña
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs py-2 pl-4">Cabaña</TableHead>
                  <TableHead className="text-xs text-center py-2">Huésp.</TableHead>
                  <TableHead className="text-xs text-center py-2 pr-4">Msgs.</TableHead>
                </TableRow>
              </TableHeader>
            </Table>
            <ScrollArea className="h-[160px] sm:h-[200px]">
              <Table>
                <TableBody>
                  {isLoading ? <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        <div className="flex items-center justify-center py-3">
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-xs">Cargando...</span>
                        </div>
                      </TableCell>
                    </TableRow> : roomActivity.length === 0 ? <TableRow>
                      <TableCell colSpan={3} className="text-center text-xs py-3">
                        No hay datos disponibles
                      </TableCell>
                    </TableRow> : <AnimatePresence>
                      {roomActivity.map(room => <motion.tr key={room.room_number} initial={{
                    opacity: 0,
                    y: 5
                  }} animate={{
                    opacity: 1,
                    y: 0
                  }} exit={{
                    opacity: 0
                  }} transition={{
                    duration: 0.2
                  }} className="group hover:bg-muted/40">
                          <TableCell className="font-medium text-xs py-2.5 pl-4">
                            {room.room_number}
                          </TableCell>
                          <TableCell className="text-center text-xs py-2.5">
                            {room.guest_count}
                          </TableCell>
                          <TableCell className="text-center text-xs py-2.5 pr-4">
                            {room.message_count}
                          </TableCell>
                        </motion.tr>)}
                    </AnimatePresence>}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Pending Messages Table */}
        <Card className="lg:col-span-3 bg-white shadow-sm">
          <CardHeader className="p-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              Mensajes Sin Responder
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Huéspedes con mensajes pendientes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs py-2 pl-4">Huésped</TableHead>
                  <TableHead className="text-xs py-2">Hab.</TableHead>
                  <TableHead className="text-xs text-right py-2">Tiempo Espera</TableHead>
                  <TableHead className="text-xs text-right py-2 pr-4">Pendientes</TableHead>
                </TableRow>
              </TableHeader>
            </Table>
            <ScrollArea className="h-[140px] sm:h-[180px]">
              <Table>
                <TableBody>
                  {isLoading ? <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        <div className="flex items-center justify-center py-3">
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-xs">Cargando...</span>
                        </div>
                      </TableCell>
                    </TableRow> : stats.filter(s => (s.pending_messages || 0) > 0).length === 0 ? <TableRow>
                      <TableCell colSpan={4} className="text-center text-xs py-3">
                        No hay mensajes pendientes
                      </TableCell>
                    </TableRow> : <AnimatePresence>
                      {stats.filter(stat => (stat.pending_messages || 0) > 0).sort((a, b) => (b.wait_time_minutes || 0) - (a.wait_time_minutes || 0)).map(stat => <motion.tr key={stat.guest_id} initial={{
                    opacity: 0,
                    y: 5
                  }} animate={{
                    opacity: 1,
                    y: 0
                  }} exit={{
                    opacity: 0
                  }} transition={{
                    duration: 0.2
                  }} className="group hover:bg-muted/40">
                            <TableCell className="font-medium text-xs py-2.5 pl-4">
                              {stat.guest_name}
                            </TableCell>
                            <TableCell className="text-xs py-2.5">
                              {stat.room_number}
                            </TableCell>
                            <TableCell className="text-right text-xs py-2.5">
                              <span className="">
                                {formatWaitTime(stat.wait_time_minutes)} min
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-xs py-2.5 pr-4">
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