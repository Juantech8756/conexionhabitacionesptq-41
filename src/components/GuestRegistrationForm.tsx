
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getMaxGuestsForRoomType } from '@/utils/roomValidation';

// Form schema for validation
const formSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
  roomId: z.string({ required_error: 'Por favor seleccione una cabaña' }),
  guestCount: z.number().int().min(1, { message: 'Debe haber al menos 1 huésped' })
    // Max guests validation will be added dynamically
});

// Form input types
interface FormInputs {
  name: string;
  roomId: string;
  guestCount: number;
}

// Component props
interface GuestRegistrationFormProps {
  onSuccess: (name: string, roomNumber: string, id: string, roomId: string) => void;
  preselectedRoomId?: string;
}

export type Room = {
  id: string;
  room_number: string;
  status?: string;
  type?: string | null;
};

const GuestRegistrationForm = ({ onSuccess, preselectedRoomId }: GuestRegistrationFormProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [maxGuests, setMaxGuests] = useState(4); // Default max guests
  const [open, setOpen] = useState(false);

  // Initialize the form with react-hook-form
  const form = useForm<FormInputs>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      guestCount: 1,
      roomId: preselectedRoomId || ''
    },
  });
  
  // Watch for room ID changes to update max guests
  const watchRoomId = form.watch("roomId");
  
  // Update max guests when room selection changes
  useEffect(() => {
    if (watchRoomId) {
      const selected = rooms.find(room => room.id === watchRoomId);
      setSelectedRoom(selected || null);
      
      if (selected?.type) {
        console.log(`Room type selected: ${selected.type}, applying guest limits`);
        const newMaxGuests = getMaxGuestsForRoomType(selected.type);
        setMaxGuests(newMaxGuests);
        
        // Validate current guest count against new max
        const currentGuestCount = form.getValues("guestCount");
        if (currentGuestCount > newMaxGuests) {
          console.log(`Adjusting guest count from ${currentGuestCount} to ${newMaxGuests} based on room type`);
          form.setValue("guestCount", newMaxGuests);
        }
      }
    }
  }, [watchRoomId, rooms, form]);

  // Fetch available rooms from Supabase
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        console.log("Fetching rooms data...");
        const { data, error } = await supabase
          .from('rooms')
          .select('id, room_number, status, type')
          .order('room_number');

        if (error) throw error;

        // Set all rooms for reference
        setRooms(data || []);
        
        // Filter to only available rooms, unless we have a preselected room
        const available = preselectedRoomId 
          ? data || []
          : (data || []).filter(room => room.status === 'available');
          
        setAvailableRooms(available);

        // If we have a preselected room ID, set it
        if (preselectedRoomId) {
          console.log(`QR scan: Preselected room ID: ${preselectedRoomId}`);
          const preselected = data?.find(room => room.id === preselectedRoomId);
          
          if (preselected) {
            console.log(`Found preselected room: ${preselected.room_number}, type: ${preselected.type}`);
            // Set the form values and selected room
            form.setValue('roomId', preselectedRoomId);
            setSelectedRoom(preselected);
            
            // Set max guests based on room type
            if (preselected.type) {
              const newMaxGuests = getMaxGuestsForRoomType(preselected.type);
              console.log(`Setting max guests to ${newMaxGuests} for room type ${preselected.type}`);
              setMaxGuests(newMaxGuests);
              
              // Ensure guest count is within the new limit
              form.setValue("guestCount", Math.min(form.getValues("guestCount"), newMaxGuests));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching rooms:', error);
      }
    };

    fetchRooms();
  }, [preselectedRoomId, form]);

  // Handle form submission
  const onSubmit = async (values: FormInputs) => {
    if (!values.roomId) {
      toast({
        title: 'Error',
        description: 'Por favor seleccione una cabaña',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Get the room number for the selected room
      const selectedRoom = rooms.find((room) => room.id === values.roomId);
      
      if (!selectedRoom) {
        toast({
          title: 'Error',
          description: 'La cabaña seleccionada no existe',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      // Register the guest in the database
      const { data: guest, error: insertError } = await supabase
        .from('guests')
        .insert({
          name: values.name,
          room_number: selectedRoom.room_number,
          room_id: values.roomId,
          guest_count: values.guestCount
        })
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      // Update the room status to occupied
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', values.roomId);

      if (updateError) {
        throw updateError;
      }

      // Call the onSuccess callback
      onSuccess(values.name, selectedRoom.room_number, guest.id, values.roomId);
      
      toast({
        title: 'Registro exitoso',
        description: `Bienvenido ${values.name} a la cabaña ${selectedRoom.room_number}`,
      });
    } catch (error) {
      console.error('Error registering guest:', error);
      toast({
        title: 'Error',
        description: 'No se pudo completar el registro. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate guest count options based on room type
  const guestCountOptions = Array.from({ length: maxGuests }, (_, i) => i + 1);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Su nombre</FormLabel>
              <FormControl>
                <Input placeholder="Nombre completo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="roomId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Cabaña</FormLabel>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={!!preselectedRoomId}
                    >
                      {field.value
                        ? rooms.find((room) => room.id === field.value)?.room_number || "Seleccione una cabaña"
                        : "Seleccione una cabaña"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Buscar cabaña..." />
                    <CommandEmpty>No se encontraron cabañas</CommandEmpty>
                    <CommandGroup>
                      {availableRooms.map((room) => (
                        <CommandItem
                          key={room.id}
                          value={room.room_number}
                          onSelect={() => {
                            form.setValue("roomId", room.id);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.value === room.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Cabaña {room.room_number} 
                          {room.type && <span className="ml-2 text-xs opacity-70">
                            ({room.type === 'family' ? 'Familiar' : room.type === 'couple' ? 'Pareja' : room.type})
                          </span>}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {preselectedRoomId && selectedRoom && (
                <FormDescription>
                  Cabaña preseleccionada: {selectedRoom.room_number} 
                  {selectedRoom.type && <span className="ml-1">
                    ({selectedRoom.type === 'family' ? 'Familiar' : selectedRoom.type === 'couple' ? 'Pareja' : selectedRoom.type})
                  </span>}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="guestCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de huéspedes</FormLabel>
              <Select
                value={field.value.toString()}
                onValueChange={(value) => field.onChange(parseInt(value))}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el número de huéspedes" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {guestCountOptions.map((count) => (
                    <SelectItem key={count} value={count.toString()}>
                      {count} {count === 1 ? 'persona' : 'personas'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {selectedRoom?.type && `Máximo ${maxGuests} personas para cabaña tipo ${
                  selectedRoom.type === 'family' ? 'Familiar' : selectedRoom.type === 'couple' ? 'Pareja' : selectedRoom.type
                }`}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registrando...
            </>
          ) : (
            'Registrar'
          )}
        </Button>
      </form>
    </Form>
  );
};

export default GuestRegistrationForm;
