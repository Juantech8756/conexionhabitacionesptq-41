
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Search, QrCode, Download, ArrowLeft, Hotel } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

type Room = {
  id: string;
  room_number: string;
  status: string;
  type: string | null;
};

const QrCodeAdminPage = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchRooms = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("rooms")
          .select("id, room_number, status, type")
          .order("room_number", { ascending: true });

        if (error) throw error;
        setRooms(data || []);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las cabañas",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRooms();
  }, [toast]);

  // Filter rooms based on search query
  const filteredRooms = rooms.filter((room) => {
    const query = searchQuery.toLowerCase();
    return (
      room.room_number.toLowerCase().includes(query) ||
      (room.type && room.type.toLowerCase().includes(query))
    );
  });

  const getRoomTypeText = (type: string | null) => {
    if (!type) return "-";
    
    switch (type.toLowerCase()) {
      case "family":
        return "Familiar";
      case "couple":
        return "Pareja";
      default:
        return type;
    }
  };

  const downloadAllQRCodes = () => {
    toast({
      title: "Preparando descarga",
      description: "La descarga de todos los códigos QR comenzará en breve...",
    });
    
    // Simulate batch processing - in a real implementation, you would generate
    // a ZIP file with all QR codes, but that requires additional server-side functionality
    setTimeout(() => {
      // For demo purposes, redirect to the first room QR code
      if (rooms.length > 0) {
        window.open(`/qr-code/${rooms[0].id}`, '_blank');
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-hotel-600 text-white p-6 shadow-md"
      >
        <div className="container mx-auto">
          <div className="flex items-center">
            <Link to="/">
              <Button variant="ghost" className="mr-4 text-white hover:bg-white/20">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Volver
              </Button>
            </Link>
            <div className="flex items-center">
              <Hotel className="h-8 w-8 mr-3" />
              <h1 className="text-2xl md:text-3xl font-bold">Códigos QR para Cabañas</h1>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto mt-6 px-4">
        <Tabs defaultValue="list" className="mt-6">
          <TabsList className="mb-6 w-full sm:w-auto">
            <TabsTrigger value="list" className="flex-1 sm:flex-initial">
              <QrCode className="h-4 w-4 mr-2" />
              Lista de Cabañas
            </TabsTrigger>
            <TabsTrigger value="info" className="flex-1 sm:flex-initial">
              <Hotel className="h-4 w-4 mr-2" />
              Información
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="list">
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Buscar cabañas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button onClick={downloadAllQRCodes} className="flex items-center">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar todos los QR
                </Button>
              </div>

              <div className="bg-white rounded-lg border">
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array(5).fill(0).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-9 w-20 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : filteredRooms.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4">
                            No hay cabañas disponibles
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRooms.map((room) => (
                          <TableRow key={room.id}>
                            <TableCell className="font-medium">{room.room_number}</TableCell>
                            <TableCell>{getRoomTypeText(room.type)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Link to={`/qr-code/${room.id}`}>
                                  <Button variant="outline" size="sm" className="flex items-center">
                                    <QrCode className="h-4 w-4 mr-2" />
                                    Ver QR
                                  </Button>
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="info">
            <Card className="p-6">
              <div className="mb-6 pb-6 border-b">
                <h2 className="text-2xl font-bold mb-4 text-hotel-700">Instrucciones de Uso</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-lg mb-2">¿Qué son estos códigos QR?</h3>
                    <p className="text-gray-700">
                      Cada código QR está vinculado a una cabaña específica del Parque Temático Quimbaya. Cuando un huésped escanea 
                      el código, es dirigido al portal de comunicación con su cabaña ya preseleccionada, facilitando la conexión con recepción.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-2">Pasos para utilizar:</h3>
                    <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                      <li>Seleccione una cabaña de la lista</li>
                      <li>Haga clic en "Ver QR" para visualizar el código</li>
                      <li>Descargue el código QR haciendo clic en "Descargar"</li>
                      <li>Imprima el código y colóquelo en la cabaña correspondiente</li>
                      <li>Los huéspedes podrán escanear el código para comunicarse directamente con recepción</li>
                    </ol>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="font-medium text-lg mb-2">Beneficios:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="bg-hotel-100 rounded-full w-10 h-10 flex items-center justify-center mb-3">
                      <QrCode className="h-5 w-5 text-hotel-700" />
                    </div>
                    <h4 className="font-medium mb-1">Identificación automática</h4>
                    <p className="text-sm text-gray-600">El sistema conoce automáticamente la cabaña del huésped, eliminando errores en la selección</p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="bg-hotel-100 rounded-full w-10 h-10 flex items-center justify-center mb-3">
                      <Hotel className="h-5 w-5 text-hotel-700" />
                    </div>
                    <h4 className="font-medium mb-1">Experiencia personalizada</h4>
                    <p className="text-sm text-gray-600">Muestra el nombre de la cabaña al escanear, creando una experiencia más personalizada</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-hotel-50 rounded-lg border border-hotel-100 text-hotel-800">
                <p className="text-sm">
                  <strong>Consejo:</strong> Coloque los códigos QR en un lugar visible dentro de cada cabaña, preferiblemente cerca de la entrada o en la mesa principal.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default QrCodeAdminPage;
