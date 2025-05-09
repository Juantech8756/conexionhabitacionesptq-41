
import { supabase } from "@/integrations/supabase/client";

// Utility function to get or create device ID
export const getDeviceId = (): string => {
  const stored = localStorage.getItem('device_id');
  if (stored) return stored;
  
  // Create new device ID if not exists
  const newId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem('device_id', newId);
  return newId;
};

// Define an explicit type for the guest registration data
type GuestRegistration = {
  id: string;
  name: string;
  room_number: string;
} | null;

// Function to check for existing guest registration
export const checkExistingRegistration = async (deviceId: string): Promise<GuestRegistration> => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .select('id, name, room_number')
      .eq('device_id', deviceId)
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
