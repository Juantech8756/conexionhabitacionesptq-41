
import { useState, useEffect } from "react";
import GuestRegistrationForm from "@/components/GuestRegistrationForm";
import GuestChat from "@/components/GuestChat";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";

const GuestPortal = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [guestId, setGuestId] = useState("");
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Check if the user has registered previously
  useEffect(() => {
    const savedName = localStorage.getItem("guestName");
    const savedRoom = localStorage.getItem("roomNumber");
    const savedId = localStorage.getItem("guestId");
    
    if (savedName && savedRoom && savedId) {
      setGuestName(savedName);
      setRoomNumber(savedRoom);
      setGuestId(savedId);
      setIsRegistered(true);
    }
  }, []);

  const handleRegister = async (name: string, room: string, id: string) => {
    setGuestName(name);
    setRoomNumber(room);
    setGuestId(id);
    setIsRegistered(true);
    
    // Save to localStorage for future visits
    localStorage.setItem("guestName", name);
    localStorage.setItem("roomNumber", room);
    localStorage.setItem("guestId", id);
  };

  const handleBackToRegistration = () => {
    // For testing, allow returning to the form
    setIsRegistered(false);
    localStorage.removeItem("guestName");
    localStorage.removeItem("roomNumber");
    localStorage.removeItem("guestId");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isRegistered ? (
        <GuestChat
          guestName={guestName}
          roomNumber={roomNumber}
          guestId={guestId}
          onBack={handleBackToRegistration}
        />
      ) : (
        <GuestRegistrationForm onRegister={handleRegister} />
      )}
    </div>
  );
};

export default GuestPortal;
