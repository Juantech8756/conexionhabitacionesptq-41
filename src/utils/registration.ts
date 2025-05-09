
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
    console.log("Checking registration with params:", { skipRedirect, roomIdFromQR });
    // Get guest ID and room ID from localStorage
    const guestId = localStorage.getItem('guest_id');
    const storedRoomId = localStorage.getItem('roomId');

    // If we have a QR code scan
    if (roomIdFromQR) {
      console.log(`QR scan detected with room ID: ${roomIdFromQR}`);
      
      // First check if user is registered for this exact room
      if (guestId && storedRoomId === roomIdFromQR) {
        console.log("User is already registered for this room. Continuing with existing session.");
        
        // Look up the guest using their ID to make sure the record still exists in DB
        const { data: existingGuest, error: guestError } = await supabase
          .from('guests')
          .select('id, name, room_number, guest_count, room_id')
          .eq('id', guestId)
          .maybeSingle();
        
        if (guestError) {
          console.error("Error fetching guest record:", guestError);
          return null;
        }
        
        if (!existingGuest) {
          console.log("Guest record no longer exists in database. Clearing localStorage.");
          localStorage.removeItem('guest_id');
          localStorage.removeItem('guestName');
          localStorage.removeItem('roomNumber');
          localStorage.removeItem('roomId');
          return null;
        }
        
        // Return the existing guest data
        return existingGuest;
      } 
      
      // If no registration or registered for a different room, check room availability
      const { data: roomData } = await supabase
        .from('rooms')
        .select('status')
        .eq('id', roomIdFromQR)
        .single();
        
      // If room is occupied but by someone else, check if there's a guest registered for this room
      if (roomData?.status === 'occupied') {
        const { data: roomGuest, error: roomGuestError } = await supabase
          .from('guests')
          .select('id, name, room_number, guest_count, room_id')
          .eq('room_id', roomIdFromQR)
          .maybeSingle();
          
        if (!roomGuestError && roomGuest) {
          // Save this guest's info to localStorage and continue with their session
          localStorage.setItem('guest_id', roomGuest.id);
          localStorage.setItem('guestName', roomGuest.name);
          localStorage.setItem('roomNumber', roomGuest.room_number);
          localStorage.setItem('roomId', roomIdFromQR);
          
          console.log("Found existing registration for this room. Continuing with that session.");
          return roomGuest;
        }
      }
      
      // If room is available or no guest found, return null to show registration form
      console.log("Room available or no guest found. Showing registration form.");
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
      
      console.log("Found valid existing registration:", data);
      return data;
    }
    
    console.log("No existing registration found.");
    return null;
  } catch (error) {
    console.error("Error checking existing registration:", error);
    return null;
  }
};

// Function to clear guest registration when a room is marked as available
export const clearRoomRegistration = async (roomId: string): Promise<boolean> => {
  try {
    console.log(`Clearing registration for room ID: ${roomId}`);
    
    // Get any guests registered for this room
    const { data: guests, error: guestError } = await supabase
      .from('guests')
      .select('id')
      .eq('room_id', roomId);
      
    if (guestError) {
      console.error("Error fetching guests for room:", guestError);
      return false;
    }
    
    // If guests found, delete them
    if (guests && guests.length > 0) {
      const { error: deleteError } = await supabase
        .from('guests')
        .delete()
        .eq('room_id', roomId);
        
      if (deleteError) {
        console.error("Error deleting guests:", deleteError);
        return false;
      }
      
      console.log(`Deleted ${guests.length} guest registrations for room ID: ${roomId}`);
    }
    
    return true;
  } catch (error) {
    console.error("Error clearing room registration:", error);
    return false;
  }
};
