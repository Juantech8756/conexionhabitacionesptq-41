
import React, { useState, useEffect } from "react";
import GuestRegistrationForm from "@/components/GuestRegistrationForm";
import GuestChat from "@/components/GuestChat";

const GuestPortal = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");

  // Comprobar si el usuario ya se ha registrado previamente
  useEffect(() => {
    const savedName = localStorage.getItem("guestName");
    const savedRoom = localStorage.getItem("roomNumber");
    
    if (savedName && savedRoom) {
      setGuestName(savedName);
      setRoomNumber(savedRoom);
      setIsRegistered(true);
    }
  }, []);

  const handleRegister = (name: string, room: string) => {
    setGuestName(name);
    setRoomNumber(room);
    setIsRegistered(true);
    
    // Guardar en localStorage para futuras visitas
    localStorage.setItem("guestName", name);
    localStorage.setItem("roomNumber", room);
  };

  const handleBackToRegistration = () => {
    // Para pruebas, permitimos volver al formulario
    setIsRegistered(false);
    localStorage.removeItem("guestName");
    localStorage.removeItem("roomNumber");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isRegistered ? (
        <GuestChat
          guestName={guestName}
          roomNumber={roomNumber}
          onBack={handleBackToRegistration}
        />
      ) : (
        <GuestRegistrationForm onRegister={handleRegister} />
      )}
    </div>
  );
};

export default GuestPortal;
