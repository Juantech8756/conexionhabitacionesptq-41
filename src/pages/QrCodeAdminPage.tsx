
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
import { Search, QrCode, Download, ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

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

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Link to="/">
          <Button variant="outline" className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Códigos QR para Cabañas</h1>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="mb-4">
          <TabsTrigger value="list">Lista de Cabañas</TabsTrigger>
          <TabsTrigger value="info">Información</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          <Card className="p-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar cabañas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg">
              <ScrollArea className="h-[calc(100vh-280px)]">
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
            <h2 className="text-xl font-bold mb-4">Instrucciones de Uso</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">¿Qué son estos códigos QR?</h3>
                <p className="text-gray-700">
                  Cada código QR está vinculado a una cabaña específica. Cuando un huésped escanea el código, 
                  es dirigido al portal con su cabaña ya preseleccionada.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-1">Pasos para utilizar:</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Seleccione una cabaña de la lista</li>
                  <li>Haga clic en "Ver QR" para visualizar el código</li>
                  <li>Descargue el código QR haciendo clic en "Descargar"</li>
                  <li>Imprima el código y colóquelo en la cabaña correspondiente</li>
                </ol>
              </div>
              <div>
                <h3 className="font-medium mb-1">Beneficios:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Mejora la experiencia del huésped al facilitar el registro</li>
                  <li>Elimina errores en la selección de cabaña</li>
                  <li>Permite un seguimiento más preciso de las comunicaciones</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QrCodeAdminPage;
