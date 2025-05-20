import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Home, Pencil, Check, X, Users, Plus, Trash } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

// Tipos para las habitaciones y huéspedes
interface Room {
  id: string;
  room_number: string;
  type: string | null;
  status: string;
  capacity: number | null;
  updated_at: string;
}

interface Guest {
  id: string;
  name: string;
  room_id: string;
  room_number: string;
  guest_count: number | null;
  created_at: string;
}

interface EnhancedRoomManagementProps {
  onRoomUpdate?: (room: Room) => void;
  showGuestCount?: boolean;
}

const statusColors: Record<string, string> = {
  available: 'bg-green-500',
  occupied: 'bg-blue-500',
  maintenance: 'bg-amber-500',
  unavailable: 'bg-red-500',
};

const roomTypeIcons: Record<string, React.ReactNode> = {
  family: <Users className="h-4 w-4" />,
  couple: <Users className="h-4 w-4" />,
  single: <Users className="h-4 w-4" />,
};

const EnhancedRoomManagement: React.FC<EnhancedRoomManagementProps> = ({ 
  onRoomUpdate,
  showGuestCount = true 
}) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editedRoom, setEditedRoom] = useState<Partial<Room>>({});
  const [newRoom, setNewRoom] = useState<Partial<Room>>({
    room_number: '',
    type: 'single',
    status: 'available',
    capacity: 1
  });
  const { toast } = useToast();

  // Cargar datos de habitaciones y huéspedes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Consultar habitaciones
        const { data: roomsData, error: roomsError } = await supabase
          .from('rooms')
          .select('*')
          .order('room_number');
        
        if (roomsError) throw roomsError;
        setRooms(roomsData || []);

        // Consultar huéspedes
        const { data: guestsData, error: guestsError } = await supabase
          .from('guests')
          .select('*');
        
        if (guestsError) throw guestsError;
        setGuests(guestsData || []);
      } catch (error) {
        console.error('Error cargando datos:', error);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los datos de las habitaciones',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [toast]);

  // Aplicar filtros a las habitaciones
  const filteredRooms = rooms.filter(room => {
    // Filtro por tipo
    if (filterType !== 'all' && room.type !== filterType) return false;
    
    // Filtro por estado
    if (filterStatus !== 'all' && room.status !== filterStatus) return false;
    
    // Búsqueda por número
    if (searchTerm && !room.room_number.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    return true;
  });

  // Función para actualizar una habitación
  const updateRoom = async () => {
    if (!selectedRoom) return;
    
    try {
      const { data, error } = await supabase
        .from('rooms')
        .update({
          type: editedRoom.type,
          status: editedRoom.status,
          capacity: editedRoom.capacity,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRoom.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Actualizar estado local
      setRooms(prevRooms => 
        prevRooms.map(room => 
          room.id === selectedRoom.id ? { ...room, ...data } : room
        )
      );
      
      toast({
        title: 'Habitación actualizada',
        description: `La cabaña ${selectedRoom.room_number} se ha actualizado correctamente.`
      });
      
      // Callback si existe
      if (onRoomUpdate && data) {
        onRoomUpdate(data);
      }
      
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error actualizando habitación:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la habitación',
        variant: 'destructive'
      });
    }
  };

  // Función para crear una habitación
  const createRoom = async () => {
    if (!newRoom.room_number) {
      toast({
        title: 'Error',
        description: 'El número de cabaña es obligatorio',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          room_number: newRoom.room_number,
          type: newRoom.type || 'single',
          status: newRoom.status || 'available',
          capacity: newRoom.capacity || 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Actualizar estado local
      setRooms(prevRooms => [...prevRooms, data]);
      
      toast({
        title: 'Habitación creada',
        description: `La cabaña ${newRoom.room_number} se ha creado correctamente.`
      });
      
      // Resetear formulario
      setNewRoom({
        room_number: '',
        type: 'single',
        status: 'available',
        capacity: 1
      });
      
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creando habitación:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la habitación',
        variant: 'destructive'
      });
    }
  };

  // Obtener huéspedes para una habitación
  const getRoomGuests = (roomId: string) => {
    return guests.filter(guest => guest.room_id === roomId);
  };

  return (
    <div className="space-y-4">
      {/* Filtros y búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search-room">Buscar cabaña</Label>
              <Input
                id="search-room"
                placeholder="Número de cabaña..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="filter-type">Tipo de cabaña</Label>
              <div className="select-container">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger id="filter-type" className="mt-1">
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="single">Individual</SelectItem>
                    <SelectItem value="couple">Pareja</SelectItem>
                    <SelectItem value="family">Familiar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="filter-status">Estado</Label>
              <div className="select-container">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger id="filter-status" className="mt-1">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="occupied">Ocupada</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    <SelectItem value="unavailable">No disponible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              {filteredRooms.length} cabañas encontradas
            </div>
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1">
                  <Plus className="h-4 w-4" /> Añadir cabaña
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear nueva cabaña</DialogTitle>
                  <DialogDescription>
                    Añade una nueva cabaña al sistema
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="new-room-number">Número de cabaña</Label>
                    <Input
                      id="new-room-number"
                      value={newRoom.room_number}
                      onChange={(e) => setNewRoom({...newRoom, room_number: e.target.value})}
                      placeholder="Ej: 101"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="new-room-type">Tipo</Label>
                    <div className="select-container">
                      <Select 
                        value={newRoom.type || 'single'} 
                        onValueChange={(value) => setNewRoom({...newRoom, type: value})}
                      >
                        <SelectTrigger id="new-room-type" className="mt-1">
                          <SelectValue placeholder="Tipo de cabaña" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Individual</SelectItem>
                          <SelectItem value="couple">Pareja</SelectItem>
                          <SelectItem value="family">Familiar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="new-room-capacity">Capacidad</Label>
                    <Input
                      id="new-room-capacity"
                      type="number"
                      min="1"
                      value={newRoom.capacity || 1}
                      onChange={(e) => setNewRoom({...newRoom, capacity: parseInt(e.target.value)})}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="new-room-status">Estado</Label>
                    <div className="select-container">
                      <Select 
                        value={newRoom.status || 'available'} 
                        onValueChange={(value) => setNewRoom({...newRoom, status: value})}
                      >
                        <SelectTrigger id="new-room-status" className="mt-1">
                          <SelectValue placeholder="Estado de la cabaña" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Disponible</SelectItem>
                          <SelectItem value="occupied">Ocupada</SelectItem>
                          <SelectItem value="maintenance">Mantenimiento</SelectItem>
                          <SelectItem value="unavailable">No disponible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={createRoom}>Crear cabaña</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
      
      {/* Lista de habitaciones */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Gestión de cabañas</CardTitle>
          <CardDescription>
            Administra las cabañas y su estado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredRooms.map((room) => {
                  const roomGuests = getRoomGuests(room.id);
                  
                  return (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      layout
                    >
                      <Card className="overflow-hidden">
                        <div className={`h-2 ${statusColors[room.status] || 'bg-gray-500'}`} />
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-semibold flex items-center gap-1">
                                <Home className="h-4 w-4" />
                                Cabaña {room.room_number}
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {room.type === 'family' ? 'Familiar' : 
                                   room.type === 'couple' ? 'Pareja' : 
                                   room.type === 'single' ? 'Individual' : 'Desconocido'}
                                </Badge>
                              </h3>
                              
                              <div className="mt-1 flex flex-wrap gap-1">
                                <Badge className={`${statusColors[room.status]} text-white`}>
                                  {room.status === 'available' ? 'Disponible' :
                                   room.status === 'occupied' ? 'Ocupada' :
                                   room.status === 'maintenance' ? 'Mantenimiento' : 'No disponible'}
                                </Badge>
                                
                                {room.capacity && (
                                  <Badge variant="secondary">
                                    {room.capacity} {room.capacity === 1 ? 'persona' : 'personas'}
                                  </Badge>
                                )}
                              </div>
                              
                              {showGuestCount && roomGuests.length > 0 && (
                                <div className="mt-3 text-sm text-muted-foreground">
                                  <p className="flex items-center gap-1">
                                    <Users className="h-3.5 w-3.5" />
                                    {roomGuests.length} {roomGuests.length === 1 ? 'huésped' : 'huéspedes'} registrado(s)
                                  </p>
                                  <ul className="mt-1 pl-5 list-disc text-xs">
                                    {roomGuests.map(guest => (
                                      <li key={guest.id}>{guest.name}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedRoom(room);
                                setEditedRoom({
                                  type: room.type,
                                  status: room.status,
                                  capacity: room.capacity
                                });
                                setEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Diálogo de edición */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cabaña {selectedRoom?.room_number}</DialogTitle>
            <DialogDescription>
              Actualiza la información de la cabaña
            </DialogDescription>
          </DialogHeader>
          
          {selectedRoom && (
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="edit-room-type">Tipo</Label>
                <div className="select-container">
                  <Select 
                    value={editedRoom.type || selectedRoom.type || 'single'} 
                    onValueChange={(value) => setEditedRoom({...editedRoom, type: value})}
                  >
                    <SelectTrigger id="edit-room-type" className="mt-1">
                      <SelectValue placeholder="Tipo de cabaña" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Individual</SelectItem>
                      <SelectItem value="couple">Pareja</SelectItem>
                      <SelectItem value="family">Familiar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-room-capacity">Capacidad</Label>
                <Input
                  id="edit-room-capacity"
                  type="number"
                  min="1"
                  value={editedRoom.capacity !== undefined ? editedRoom.capacity : selectedRoom.capacity || 1}
                  onChange={(e) => setEditedRoom({...editedRoom, capacity: parseInt(e.target.value)})}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-room-status">Estado</Label>
                <div className="select-container">
                  <Select 
                    value={editedRoom.status || selectedRoom.status || 'available'} 
                    onValueChange={(value) => setEditedRoom({...editedRoom, status: value})}
                  >
                    <SelectTrigger id="edit-room-status" className="mt-1">
                      <SelectValue placeholder="Estado de la cabaña" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Disponible</SelectItem>
                      <SelectItem value="occupied">Ocupada</SelectItem>
                      <SelectItem value="maintenance">Mantenimiento</SelectItem>
                      <SelectItem value="unavailable">No disponible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={updateRoom}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedRoomManagement; 