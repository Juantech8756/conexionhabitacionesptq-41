
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
    console.log("Checking registration with params:", { skipRedirect, roomIdFromQR });
    // Get guest ID and room ID from localStorage
    const guestId = localStorage.getItem('guest_id');
    const storedRoomId = localStorage.getItem('roomId');

    // If we have a QR code scan with a room ID
    if (roomIdFromQR) {
      console.log(`QR scan detected with room ID: ${roomIdFromQR}`);
      
      // IMPROVED: First check if there's ANY existing guest registered for this room in the database
      // This allows access from any device that scans the QR code for an occupied room
      const { data: roomGuest, error: roomGuestError } = await supabase
        .from('guests')
        .select('id, name, room_number, guest_count, room_id')
        .eq('room_id', roomIdFromQR)
        .maybeSingle();
      
      // If we found a guest for this room in the database
      if (!roomGuestError && roomGuest) {
        console.log("Found existing registration for this room in database:", roomGuest);
        
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
          
        console.log("Room guest info saved to localStorage and room confirmed as occupied");
        return roomGuest;
      }
      
      // If the user has a stored guest ID for this exact room
      if (guestId && storedRoomId === roomIdFromQR) {
        console.log("User is already registered for this room in localStorage. Verifying in database...");
        
        // Verify the guest record still exists in database
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
      
      // No registration found for this room - check room status
      console.log("No existing registration found for this room. Checking room status...");
      const { data: roomData } = await supabase
        .from('rooms')
        .select('status')
        .eq('id', roomIdFromQR)
        .single();
      
      // If room is available or no status data, show registration form
      console.log("Room status:", roomData?.status || "unknown");
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
