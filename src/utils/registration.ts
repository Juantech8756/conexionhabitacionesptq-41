
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
    // Get guest ID from localStorage if it exists
    const guestId = localStorage.getItem('guest_id');
    const storedRoomId = localStorage.getItem('roomId');

    // If we have a QR code scan and existing registration
    if (guestId && roomIdFromQR) {
      console.log(`QR scan detected with room ID: ${roomIdFromQR}. Current stored room: ${storedRoomId}`);
      
      // Check if user is registered for this exact room
      if (storedRoomId === roomIdFromQR) {
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
      
      // If it's a different room, we'll allow the user to register for the new room
      console.log("User is registered for a different room. Will show registration form for new room.");
      return null;
    }
    
    // If no guest ID in localStorage, show the registration form
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
    
    console.log("Found valid existing registration:", data);
    return data;
  } catch (error) {
    console.error("Error checking existing registration:", error);
    return null;
  }
};
