import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, AreaChart, Area } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Colores para los gráficos
const COLORS = ['#8B5CF6', '#D946EF', '#F97316', '#0EA5E9', '#6E59A5', '#10B981'];
const ROOM_COLORS = ['#0EA5E9', '#8B5CF6', '#F97316', '#10B981', '#D946EF', '#6E59A5'];

// Tipos
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

type PieChartData = {
  name: string;
  value: number;
};

interface EnhancedStatsChartsProps {
  dailyActivity: DailyActivityStat[];
  roomActivity: RoomActivityStat[];
  activeGuests: number;
  inactiveGuests: number;
  totalMessages: number;
  pendingMessages: number;
  responseRate: number;
}

const EnhancedStatsCharts: React.FC<EnhancedStatsChartsProps> = ({
  dailyActivity,
  roomActivity,
  activeGuests,
  inactiveGuests,
  totalMessages,
  pendingMessages,
  responseRate
}) => {
  const [selectedChart, setSelectedChart] = useState('activity');

  // Preparar datos para gráfico de actividad de mensajes por día
  const messageActivityData = dailyActivity.map(day => ({
    name: day.date,
    mensajes: day.message_count,
    huéspedes: day.unique_guests
  }));

  // Preparar datos para gráfico de habitaciones
  const roomData = roomActivity
    .slice(0, 8) // Limitar a las 8 habitaciones más activas
    .map(room => ({
      name: room.room_number,
      mensajes: room.message_count,
      huéspedes: room.guest_count
    }));

  // Preparar datos para gráfico de pastel de estado de huéspedes
  const guestStatusData: PieChartData[] = [
    { name: 'Activos', value: activeGuests },
    { name: 'Inactivos', value: inactiveGuests }
  ];

  // Preparar datos para gráfico de pastel de mensajes
  const messageStatusData: PieChartData[] = [
    { name: 'Respondidos', value: totalMessages - pendingMessages },
    { name: 'Pendientes', value: pendingMessages }
  ];

  // Formatear porcentaje para tooltip
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  // Componente personalizado para tooltip de gráficos
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-sm text-xs">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Gráfico de actividad diaria con líneas y áreas
  const ActivityChart = () => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Actividad diaria</CardTitle>
        <CardDescription>Mensajes y huéspedes activos por día</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={messageActivityData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorMensajes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="colorHuespedes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" stroke="#8B5CF6" />
              <YAxis yAxisId="right" orientation="right" stroke="#0EA5E9" />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="mensajes"
                stroke="#8B5CF6"
                fillOpacity={1}
                fill="url(#colorMensajes)"
                name="Mensajes"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="huéspedes"
                stroke="#0EA5E9"
                fillOpacity={1}
                fill="url(#colorHuespedes)"
                name="Huéspedes"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  // Gráfico de habitaciones más activas
  const RoomActivityChart = () => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Cabañas más activas</CardTitle>
        <CardDescription>Actividad por cabaña</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={roomData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.2} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="mensajes" name="Mensajes" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={20} />
              <Bar dataKey="huéspedes" name="Huéspedes" fill="#0EA5E9" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  // Gráficos de pastel para estado de huéspedes y mensajes
  const StatusCharts = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Estado de huéspedes</CardTitle>
          <CardDescription>Distribución de huéspedes activos e inactivos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={guestStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${formatPercentage(percent * 100)}`}
                  labelLine={false}
                >
                  {guestStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Estado de mensajes</CardTitle>
          <CardDescription>Tasa de respuesta: {responseRate.toFixed(1)}%</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={messageStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${formatPercentage(percent * 100)}`}
                  labelLine={false}
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#F97316" />
                </Pie>
                <Tooltip formatter={(value) => [value, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs defaultValue="activity" onValueChange={setSelectedChart} value={selectedChart}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activity">Actividad diaria</TabsTrigger>
          <TabsTrigger value="rooms">Cabañas</TabsTrigger>
          <TabsTrigger value="status">Estado</TabsTrigger>
        </TabsList>
        <TabsContent value="activity" className="mt-4">
          <ActivityChart />
        </TabsContent>
        <TabsContent value="rooms" className="mt-4">
          <RoomActivityChart />
        </TabsContent>
        <TabsContent value="status" className="mt-4">
          <StatusCharts />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedStatsCharts; 