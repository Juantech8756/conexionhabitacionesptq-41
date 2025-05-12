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
import { Plus, Edit, Trash, Search, CircleCheck, CircleX, QrCode, CheckSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { RoomManagementProps } from "@/components/RoomManagementProps";
import { clearRoomRegistration } from "@/utils/registration";
import { useIsMobile } from "@/hooks/use-mobile";
import { Checkbox } from "@/components/ui/checkbox";

// Define the schema for form validation
const roomFormSchema = z.object({
  room_number: z.string().min(1, { message: "El nombre de la cabaña es obligatorio" }),
  status: z.string().min(1, { message: "El estado es obligatorio" }),
  type: z.string().min(1, { message: "El tipo de cabaña es obligatorio" }),
});

// Define the schema for bulk edit form validation
const bulkEditFormSchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
});

type RoomFormValues = z.infer<typeof roomFormSchema>;
type BulkEditFormValues = z.infer<typeof bulkEditFormSchema>;

type Room = {
  id: string;
  room_number: string;
  status: string;
  floor: string | null;
  type: string | null;
  created_at: string;
};

const RoomManagement = ({ showGuestCount, children }: RoomManagementProps) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      room_number: "",
      status: "available",
      type: "family",
    },
  });

  const bulkEditForm = useForm<BulkEditFormValues>({
    resolver: zodResolver(bulkEditFormSchema),
    defaultValues: {
      status: undefined,
      type: undefined,
    },
  });

  // Fetch rooms and set up real-time subscription
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

    // Initial fetch
    fetchRooms();

    // Set up real-time subscription for all room changes
    const channel = supabase
      .channel("rooms-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        (payload) => {
          console.log("Real-time update received:", payload);
          
          // Handle different types of changes
          if (payload.eventType === "INSERT") {
            setRooms((currentRooms) => [...currentRooms, payload.new as Room]);
          } else if (payload.eventType === "UPDATE") {
            setRooms((currentRooms) =>
              currentRooms.map((room) =>
                room.id === payload.new.id ? (payload.new as Room) : room
              )
            );
          } else if (payload.eventType === "DELETE") {
            setRooms((currentRooms) =>
              currentRooms.filter((room) => room.id !== payload.old.id)
            );
            // Clear selection if deleted room was selected
            setSelectedRooms(prev => prev.filter(id => id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cleanup subscription
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

  // Open dialog for bulk edit
  const openBulkEditDialog = () => {
    if (selectedRooms.length === 0) {
      toast({
        title: "Selección vacía",
        description: "Por favor, seleccione al menos una cabaña para editar",
        variant: "destructive",
      });
      return;
    }

    bulkEditForm.reset({
      status: undefined,
      type: undefined,
    });
    setIsBulkEditDialogOpen(true);
  };

  // Handle form submission for individual room
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

        // If status is changing to available, clear any guest registrations
        if (values.status === 'available' && currentRoom.status !== 'available') {
          const success = await clearRoomRegistration(currentRoom.id);
          if (success) {
            toast({
              title: "Cabaña actualizada",
              description: `La cabaña ${values.room_number} ha sido actualizada y está lista para nuevos huéspedes.`,
            });
          } else {
            toast({
              title: "Cabaña actualizada",
              description: `La cabaña ${values.room_number} ha sido actualizada, pero ocurrió un error al limpiar los registros anteriores.`,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Cabaña actualizada",
            description: `La cabaña ${values.room_number} ha sido actualizada correctamente.`,
          });
        }
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

  // Handle bulk edit form submission
  const onSubmitBulkEdit = async (values: BulkEditFormValues) => {
    const hasChanges = Object.values(values).some(value => value !== undefined);
    
    if (!hasChanges) {
      toast({
        title: "Sin cambios",
        description: "No se han especificados cambios para aplicar",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare update object with only defined values
      const updateData: { [key: string]: any } = {};
      if (values.status) updateData.status = values.status;
      if (values.type) updateData.type = values.type;
      updateData.updated_at = new Date().toISOString();

      // Update all selected rooms
      const { error } = await supabase
        .from("rooms")
        .update(updateData)
        .in("id", selectedRooms);

      if (error) throw error;

      // Check if rooms are being set to available and need to clear registrations
      if (values.status === 'available') {
        // Get current status of selected rooms
        const { data: selectedRoomsData } = await supabase
          .from("rooms")
          .select("id, status")
          .in("id", selectedRooms);

        // Clear guest registrations for rooms that were not previously available
        if (selectedRoomsData) {
          for (const room of selectedRoomsData) {
            if (room.status !== 'available') {
              await clearRoomRegistration(room.id);
            }
          }
        }
      }

      toast({
        title: "Cabañas actualizadas",
        description: `Se han actualizado ${selectedRooms.length} cabañas correctamente.`,
      });

      // Reset selections after successful update
      setSelectedRooms([]);
      setSelectAllChecked(false);
      setIsBulkEditDialogOpen(false);
    } catch (error: any) {
      console.error("Error updating rooms:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron actualizar las cabañas",
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

      // Remove from selection if it was selected
      if (selectedRooms.includes(room.id)) {
        setSelectedRooms(prev => prev.filter(id => id !== room.id));
      }
    } catch (error: any) {
      console.error("Error deleting room:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la cabaña",
        variant: "destructive",
      });
    }
  };

  // Toggle selection of a room
  const toggleRoomSelection = (roomId: string) => {
    setSelectedRooms(prev => {
      if (prev.includes(roomId)) {
        // Unselect
        const newSelection = prev.filter(id => id !== roomId);
        if (selectAllChecked && newSelection.length < filteredRooms.length) {
          setSelectAllChecked(false);
        }
        return newSelection;
      } else {
        // Select
        const newSelection = [...prev, roomId];
        if (newSelection.length === filteredRooms.length) {
          setSelectAllChecked(true);
        }
        return newSelection;
      }
    });
  };

  // Toggle selection of all rooms
  const toggleSelectAll = () => {
    if (selectAllChecked) {
      setSelectedRooms([]);
    } else {
      setSelectedRooms(filteredRooms.map(room => room.id));
    }
    setSelectAllChecked(!selectAllChecked);
  };

  // Delete selected rooms
  const deleteSelectedRooms = async () => {
    if (selectedRooms.length === 0) return;

    if (!confirm(`¿Está seguro que desea eliminar ${selectedRooms.length} cabañas seleccionadas?`)) return;

    try {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .in("id", selectedRooms);

      if (error) throw error;

      toast({
        title: "Cabañas eliminadas",
        description: `Se han eliminado ${selectedRooms.length} cabañas correctamente.`,
      });

      setSelectedRooms([]);
      setSelectAllChecked(false);
    } catch (error: any) {
      console.error("Error deleting rooms:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron eliminar las cabañas",
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
        <div className="flex gap-2">
          {selectedRooms.length > 0 && (
            <>
              <Button onClick={openBulkEditDialog} variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Editar ({selectedRooms.length})
              </Button>
              <Button onClick={deleteSelectedRooms} variant="destructive">
                <Trash className="h-4 w-4 mr-2" />
                Eliminar ({selectedRooms.length})
              </Button>
            </>
          )}
          <Button onClick={openNewRoomDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cabaña
          </Button>
        </div>
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
                <TableHead className={isMobile ? "w-[30px] px-1" : "w-[40px]"}>
                  <div className="flex items-center justify-center">
                    <Button 
                      variant="checkbox" 
                      size={isMobile ? "checkboxXs" : "checkbox"}
                      className={`rounded transition-colors ${
                        selectAllChecked 
                          ? "bg-hotel-600 text-white border-hotel-600" 
                          : "bg-transparent border border-gray-300 hover:border-hotel-400"
                      }`}
                      onClick={toggleSelectAll}
                      aria-label="Seleccionar todas las cabañas"
                    >
                      {selectAllChecked && <CheckSquare className={`text-white ${isMobile ? "h-2 w-2" : "h-3 w-3"}`} />}
                    </Button>
                  </div>
                </TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                {showGuestCount && <TableHead>Huéspedes</TableHead>}
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={showGuestCount ? 6 : 5} className="text-center py-4">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : filteredRooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showGuestCount ? 6 : 5} className="text-center py-4">
                    No hay cabañas disponibles
                  </TableCell>
                </TableRow>
              ) : (
                filteredRooms.map((room) => (
                  <TableRow key={room.id} className={selectedRooms.includes(room.id) ? "bg-blue-50" : ""}>
                    <TableCell className={isMobile ? "px-1" : ""}>
                      <div className="flex items-center justify-center">
                        <Button 
                          variant="checkbox" 
                          size={isMobile ? "checkboxXs" : "checkbox"} 
                          className={`rounded transition-colors ${
                            selectedRooms.includes(room.id) 
                              ? "bg-hotel-600 text-white border-hotel-600" 
                              : "bg-transparent border border-gray-300 hover:border-hotel-400"
                          }`}
                          onClick={() => toggleRoomSelection(room.id)}
                          aria-label={`Seleccionar cabaña ${room.room_number}`}
                        >
                          {selectedRooms.includes(room.id) && <CheckSquare className={`text-white ${isMobile ? "h-2 w-2" : "h-3 w-3"}`} />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{room.room_number}</TableCell>
                    <TableCell>{getTypeLabel(room.type)}</TableCell>
                    <TableCell>{getStatusBadge(room.status)}</TableCell>
                    {showGuestCount && (
                      <TableCell>
                        {/* This is a placeholder for guest count */}
                        {/* Implement guest count display here if needed */}
                        -
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center space-x-1">
                        <Button
                          variant="ghost"
                          size={isMobile ? "sm" : "icon"}
                          onClick={() => openEditRoomDialog(room)}
                          className={isMobile ? "h-8 w-8 p-1" : ""}
                        >
                          <Edit className={isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} />
                        </Button>
                        <Button
                          variant="ghost"
                          size={isMobile ? "sm" : "icon"}
                          onClick={() => deleteRoom(room)}
                          className={isMobile ? "h-8 w-8 p-1" : ""}
                        >
                          <Trash className={isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} />
                        </Button>
                        <Link to={`/qr-code/${room.id}`}>
                          <Button
                            variant="ghost"
                            size={isMobile ? "sm" : "icon"}
                            title="Ver código QR"
                            className={isMobile ? "h-8 w-8 p-1" : ""}
                          >
                            <QrCode className={isMobile ? "h-3.5 w-3.5" : "h-4 w-4"} />
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

      {/* Individual room edit dialog */}
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

      {/* Bulk edit dialog */}
      <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {selectedRooms.length} cabañas</DialogTitle>
            <DialogDescription>
              Seleccione los campos que desea modificar en todas las cabañas seleccionadas.
              Los campos vacíos no se modificarán.
            </DialogDescription>
          </DialogHeader>
          <Form {...bulkEditForm}>
            <form onSubmit={bulkEditForm.handleSubmit(onSubmitBulkEdit)} className="space-y-4">
              <FormField
                control={bulkEditForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No cambiar" />
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
                control={bulkEditForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No cambiar" />
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
                <Button variant="outline" type="button" onClick={() => setIsBulkEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Aplicar cambios</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {children}
    </div>
  );
};

export default RoomManagement;
