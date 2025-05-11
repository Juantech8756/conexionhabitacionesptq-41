
import React from 'react';
import { motion } from 'framer-motion';
import { Hotel, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import GuestRegistrationForm from './GuestRegistrationForm';

interface GuestRegistrationFormWrapperProps {
  onRegister: (name: string, room: string, id: string, roomId: string) => void;
  preselectedRoomId?: string;
  showSuccessToast?: boolean;
  isSimulation?: boolean;
}

const GuestRegistrationFormWrapper = ({
  onRegister,
  preselectedRoomId,
  showSuccessToast = true,
  isSimulation = false
}: GuestRegistrationFormWrapperProps) => {
  const isMobile = useIsMobile();

  return (
    <div className={`min-h-screen flex items-center justify-center ${isSimulation ? 'pt-12' : ''} bg-gray-50 p-4`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg overflow-hidden">
          <CardHeader className="text-center bg-gradient-to-r from-hotel-700 to-hotel-600 text-white">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 20 }}
              className="mx-auto rounded-full bg-white p-3 w-16 h-16 flex items-center justify-center shadow-lg mb-2"
            >
              <Hotel className="h-10 w-10 text-hotel-600" />
            </motion.div>
            <CardTitle className="text-2xl font-bold">
              {isSimulation ? 'Simulación - ' : ''}
              Bienvenido a Quimbayas
            </CardTitle>
            <CardDescription className="text-white/90 text-base">
              Por favor, complete su registro para comunicarse con recepción
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <GuestRegistrationForm 
              onSuccess={onRegister} 
              preselectedRoomId={preselectedRoomId} 
            />
          </CardContent>
          <CardFooter className="bg-gray-50 border-t p-4 flex justify-center flex-col items-center text-center">
            <p className="text-xs text-gray-500 mb-2">
              Al registrarse, podrá comunicarse directamente con la recepción.
            </p>
            {isSimulation && (
              <p className="text-xs text-blue-600 font-medium">
                Modo de simulación - Los datos registrados son reales
              </p>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default GuestRegistrationFormWrapper;
