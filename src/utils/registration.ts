
import { supabase } from "@/integrations/supabase/client";

// Define an explicit type for the guest registration data
export type GuestRegistration = {
  id: string;
  name: string;
  room_number: string;
  guest_count?: number | null;
  room_id?: string | null;
} | null;

// Function to check if there's an existing guest registration using localStorage
export const checkExistingRegistration = async (skipRedirect?: boolean, roomIdFromQR?: string): Promise<GuestRegistration> => {
  try {
    // Get guest ID from localStorage if it exists
    const guestId = localStorage.getItem('guest_id');
    const storedRoomId = localStorage.getItem('roomId');
    
    // Si hay un roomIdFromQR y un guestId existente, verificamos si es el mismo room
    if (guestId && roomIdFromQR) {
      console.log(`QR scan detected with room ID: ${roomIdFromQR}. Checking if user is already registered for this room.`);
      
      // Si el usuario ya está registrado, comprobamos si es para la misma habitación
      if (storedRoomId === roomIdFromQR) {
        console.log("User is already registered for this room. Continuing to chat.");
        // Es la misma habitación, continuamos con la sesión existente
        skipRedirect = false;
      } else {
        console.log("User is registered for a different room. Showing registration form for new room.");
        // Es una habitación diferente, mostramos el formulario
        return null;
      }
    }
    
    // Si no hay ID de invitado almacenado, retornamos null para mostrar el formulario
    if (!guestId) {
      console.log("No existing registration found, showing registration form");
      return null;
    }
    
    // Look up the guest using their ID
    const { data, error } = await supabase
      .from('guests')
      .select('id, name, room_number, guest_count, room_id')
      .eq('id', guestId)
      .maybeSingle();
      
    if (error) {
      console.error("Error checking registration:", error);
      return null;
    }
    
    if (!data) {
      console.log("Guest ID exists in localStorage but not in database. Clearing localStorage.");
      localStorage.removeItem('guest_id');
      localStorage.removeItem('guestName');
      localStorage.removeItem('roomNumber');
      localStorage.removeItem('roomId');
      return null;
    }
    
    // Si llegamos aquí, el usuario está registrado correctamente
    // Si el roomIdFromQR coincide con el almacenado, mantenemos la sesión
    return data;
  } catch (error) {
    console.error("Error checking existing registration:", error);
    return null;
  }
};
