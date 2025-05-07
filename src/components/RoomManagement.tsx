import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit, Trash, Search, CircleCheck, CircleX, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";

// Define the schema for form validation
const roomFormSchema = z.object({
  room_number: z.string().min(1, { message: "El nombre de la cabaña es obligatorio" }),
  status: z.string().min(1, { message: "El estado es obligatorio" }),
  type: z.string().min(1, { message: "El tipo de cabaña es obligatorio" }),
});

type RoomFormValues = z.infer<typeof roomFormSchema>;

type Room = {
  id: string;
  room_number: string;
  status: string;
  floor: string | null;
  type: string | null;
  created_at: string;
};

const RoomManagement = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      room_number: "",
      status: "available",
      type: "family",
    },
  });

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("rooms")
          .select("*")
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

    // Subscribe to changes
    const channel = supabase
      .channel("public:rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, fetchRooms)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  // Open dialog for new room
  const openNewRoomDialog = () => {
    setCurrentRoom(null);
    form.reset({
      room_number: "",
      status: "available",
      type: "family",
    });
    setIsDialogOpen(true);
  };

  // Open dialog for edit room
  const openEditRoomDialog = (room: Room) => {
    setCurrentRoom(room);
    form.reset({
      room_number: room.room_number,
      status: room.status,
      type: room.type || "family",
    });
    setIsDialogOpen(true);
  };

  // Handle form submission
  const onSubmit = async (values: RoomFormValues) => {
    try {
      if (currentRoom) {
        // Update existing room
        const { error } = await supabase
          .from("rooms")
          .update({
            room_number: values.room_number,
            status: values.status,
            type: values.type,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentRoom.id);

        if (error) throw error;

        toast({
          title: "Cabaña actualizada",
          description: `La cabaña ${values.room_number} ha sido actualizada correctamente.`,
        });
      } else {
        // Insert new room
        const { data, error } = await supabase.from("rooms").insert([
          {
            room_number: values.room_number,
            status: values.status,
            type: values.type,
          },
        ]).select("id");

        if (error) throw error;

        toast({
          title: "Cabaña creada",
          description: (
            <div>
              <p>La cabaña {values.room_number} ha sido creada correctamente.</p>
              <Link to={`/qr-code/${data[0].id}`} className="text-hotel-600 hover:underline flex items-center mt-2">
                <QrCode className="h-4 w-4 mr-1" /> Ver código QR
              </Link>
            </div>
          ),
        });
      }

      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving room:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la cabaña",
        variant: "destructive",
      });
    }
  };

  // Delete room
  const deleteRoom = async (room: Room) => {
    if (!confirm(`¿Está seguro que desea eliminar la cabaña ${room.room_number}?`)) return;

    try {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", room.id);

      if (error) throw error;

      toast({
        title: "Cabaña eliminada",
        description: `La cabaña ${room.room_number} ha sido eliminada correctamente.`,
      });
    } catch (error: any) {
      console.error("Error deleting room:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la cabaña",
        variant: "destructive",
      });
    }
  };

  // Filter rooms based on search query
  const filteredRooms = rooms.filter((room) => {
    const query = searchQuery.toLowerCase();
    return (
      room.room_number.toLowerCase().includes(query) ||
      (room.type && room.type.toLowerCase().includes(query)) ||
      room.status.toLowerCase().includes(query)
    );
  });

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "available":
        return (
          <span className="inline-flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
            <CircleCheck className="h-3 w-3 mr-1" />
            Disponible
          </span>
        );
      case "occupied":
        return (
          <span className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
            <CircleCheck className="h-3 w-3 mr-1" />
            Ocupada
          </span>
        );
      case "maintenance":
        return (
          <span className="inline-flex items-center bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
            <CircleX className="h-3 w-3 mr-1" />
            Mantenimiento
          </span>
        );
      case "cleaning":
        return (
          <span className="inline-flex items-center bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
            <CircleCheck className="h-3 w-3 mr-1" />
            Limpieza
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
            {status}
          </span>
        );
    }
  };

  // Get type label
  const getTypeLabel = (type: string | null) => {
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
    <div className="container mx-auto p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestión de Cabañas</h2>
        <Button onClick={openNewRoomDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cabaña
        </Button>
      </div>

      <div className="flex mb-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar cabañas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow flex-grow overflow-hidden">
        <ScrollArea className="h-[calc(100vh-270px)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : filteredRooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No hay cabañas disponibles
                  </TableCell>
                </TableRow>
              ) : (
                filteredRooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.room_number}</TableCell>
                    <TableCell>{getTypeLabel(room.type)}</TableCell>
                    <TableCell>{getStatusBadge(room.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditRoomDialog(room)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRoom(room)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                        <Link to={`/qr-code/${room.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Ver código QR"
                          >
                            <QrCode className="h-4 w-4" />
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentRoom ? "Editar Cabaña" : "Nueva Cabaña"}
            </DialogTitle>
            <DialogDescription>
              Complete los detalles de la cabaña a continuación.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="room_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Cabaña</FormLabel>
                    <FormControl>
                      <Input placeholder="Cabaña Azul" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="family">Familiar</SelectItem>
                        <SelectItem value="couple">Pareja</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">Disponible</SelectItem>
                        <SelectItem value="occupied">Ocupada</SelectItem>
                        <SelectItem value="maintenance">Mantenimiento</SelectItem>
                        <SelectItem value="cleaning">Limpieza</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoomManagement;
