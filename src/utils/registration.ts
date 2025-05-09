
import { supabase } from "@/integrations/supabase/client";

// Define an explicit type for the guest registration data
export type GuestRegistration = {
  id: string;
  name: string;
  room_number: string;
} | null;

// Function to check if there's an existing guest registration using localStorage
export const checkExistingRegistration = async (): Promise<GuestRegistration> => {
  try {
    // Get guest ID from localStorage if it exists
    const guestId = localStorage.getItem('guest_id');
    
    // If no guest ID is stored, return null
    if (!guestId) {
      return null;
    }
    
    // Look up the guest using their ID
    const { data, error } = await supabase
      .from('guests')
      .select('id, name, room_number')
      .eq('id', guestId)
      .maybeSingle();
      
    if (error) {
      console.error("Error checking registration:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error checking existing registration:", error);
    return null;
  }
};
