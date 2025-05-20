import { supabase } from "@/integrations/supabase/client";

// Define an explicit type for the guest registration data
export type GuestRegistration = {
  id: string;
  name: string;
  room_number: string;
  guest_count?: number | null;
  room_id?: string | null;
} | null;

// Function to check if there's an existing guest registration using both localStorage and database
export const checkExistingRegistration = async (skipRedirect?: boolean, roomIdFromQR?: string): Promise<GuestRegistration> => {
  try {
    // Get guest ID and room ID from localStorage
    const guestId = localStorage.getItem('guest_id');
    const storedRoomId = localStorage.getItem('roomId');

    // If we have a QR code scan with a room ID - PRIORITIZE checking database first
    if (roomIdFromQR) {
      // IMPROVED PRIORITY: First check if there's ANY existing guest registered for this room in the database
      // This allows access from any device that scans the QR code for an occupied room
      const { data: roomGuest, error: roomGuestError } = await supabase
        .from('guests')
        .select('id, name, room_number, guest_count, room_id')
        .eq('room_id', roomIdFromQR)
        .maybeSingle();
      
      // If we found a guest for this room in the database
      if (!roomGuestError && roomGuest) {
        // Update localStorage with this room's guest info for future reference
        localStorage.setItem('guest_id', roomGuest.id);
        localStorage.setItem('guestName', roomGuest.name);
        localStorage.setItem('roomNumber', roomGuest.room_number);
        localStorage.setItem('roomId', roomIdFromQR);
        
        // Also update room status to ensure it's marked as occupied
        await supabase
          .from('rooms')
          .update({ status: 'occupied' })
          .eq('id', roomIdFromQR);
          
        return roomGuest;
      }
      
      // If no direct guest found, check room status
      const { data: roomData } = await supabase
        .from('rooms')
        .select('status, room_number')
        .eq('id', roomIdFromQR)
        .single();
        
      if (roomData && roomData.status === 'occupied') {
        // We'll create a placeholder guest record to maintain consistency
        // This handles cases where the room status and guest records are out of sync
        return null;
      }
      
      // If the user has a stored guest ID for this exact room
      if (guestId && storedRoomId === roomIdFromQR) {
        // Verify the guest record still exists in database
        const { data: existingGuest, error: guestError } = await supabase
          .from('guests')
          .select('id, name, room_number, guest_count, room_id')
          .eq('id', guestId)
          .maybeSingle();
        
        if (guestError) {
          return null;
        }
        
        if (!existingGuest) {
          // Guest record no longer exists in database. Clearing localStorage
          localStorage.removeItem('guest_id');
          localStorage.removeItem('guestName');
          localStorage.removeItem('roomNumber');
          localStorage.removeItem('roomId');
          return null;
        }
        
        // Return the existing guest data
        return existingGuest;
      } 
      
      // No registration found for this room - check room status
      return null;
    }
    
    // If no QR code scan (regular visit) but has stored guest ID
    if (guestId) {
      // Look up the guest using their ID
      const { data, error } = await supabase
        .from('guests')
        .select('id, name, room_number, guest_count, room_id')
        .eq('id', guestId)
        .maybeSingle();
        
      if (error) {
        return null;
      }
      
      if (!data) {
        // Guest ID exists in localStorage but not in database. Clearing localStorage
        localStorage.removeItem('guest_id');
        localStorage.removeItem('guestName');
        localStorage.removeItem('roomNumber');
        localStorage.removeItem('roomId');
        return null;
      }
      
      return data;
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

// Function to clear guest registration when a room is marked as available
export const clearRoomRegistration = async (roomId: string): Promise<boolean> => {
  try {
    // Get any guests registered for this room
    const { data: guests, error: guestError } = await supabase
      .from('guests')
      .select('id')
      .eq('room_id', roomId);
      
    if (guestError) {
      return false;
    }
    
    // If guests found, delete them
    if (guests && guests.length > 0) {
      const { error: deleteError } = await supabase
        .from('guests')
        .delete()
        .eq('room_id', roomId);
        
      if (deleteError) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
};
