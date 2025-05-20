import { useState } from "react";
import GuestRegistrationForm from "./GuestRegistrationForm";
import NotificationPermissionRequest from "./NotificationPermissionRequest";
import { AnimatePresence, motion } from "framer-motion";

interface GuestRegistrationFormWrapperProps {
  onRegister: (name: string, room: string, id: string, roomId: string) => void;
  preselectedRoomId?: string;
  showSuccessToast?: boolean;
}

const GuestRegistrationFormWrapper = ({ 
  onRegister,
  preselectedRoomId,
  showSuccessToast = true
}: GuestRegistrationFormWrapperProps) => {
  const [registrationData, setRegistrationData] = useState<{
    name: string;
    roomNumber: string;
    id: string;
    roomId: string;
  } | null>(null);
  
  const [notificationsDismissed, setNotificationsDismissed] = useState(false);
  
  const handleRegistration = (name: string, roomNumber: string, id: string, roomId: string) => {
    // Capture the registration data
    setRegistrationData({
      name,
      roomNumber,
      id,
      roomId
    });
  };
  
  const handleNotificationPermissionChange = (granted: boolean) => {
    // Whether granted or not, proceed with registration
    setNotificationsDismissed(true);
    
    if (registrationData) {
      onRegister(
        registrationData.name,
        registrationData.roomNumber,
        registrationData.id,
        registrationData.roomId
      );
    }
  };
  
  // If there's no registration data yet, show the form
  if (!registrationData) {
    return (
      <div className="w-full h-full layout-fullwidth">
        <GuestRegistrationForm 
          onRegister={handleRegistration}
          preselectedRoomId={preselectedRoomId}
          showSuccessToast={showSuccessToast}
        />
      </div>
    );
  }
  
  // If notifications have been handled, nothing to show here
  if (notificationsDismissed) {
    return null;
  }
  
  // Show notification permission request
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 flex flex-col items-center justify-center w-full h-full layout-fullwidth"
      >
        <div className="w-full max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-center mb-4">
            ¡Registro exitoso!
          </h2>
          
          <p className="text-gray-600 text-center mb-6">
            Para mejorar tu experiencia, te recomendamos activar las notificaciones.
          </p>
          
          <NotificationPermissionRequest
            type="guest"
            guestId={registrationData.id}
            roomId={registrationData.roomId}
            roomNumber={registrationData.roomNumber}
            onPermissionChange={handleNotificationPermissionChange}
            className="mb-0"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GuestRegistrationFormWrapper;
