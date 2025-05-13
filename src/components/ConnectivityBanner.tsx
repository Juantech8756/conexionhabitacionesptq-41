import React from 'react';
import { useConnectivity } from '@/hooks/use-connectivity';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, WifiOff } from 'lucide-react';

export function ConnectivityBanner() {
  const { isOnline, reconnecting } = useConnectivity();

  if (reconnecting) {
    return (
      <Alert className="fixed bottom-4 left-4 right-4 z-50 bg-amber-50 border-amber-300">
        <Loader2 className="h-4 w-4 text-amber-500 animate-spin mr-2" />
        <AlertTitle>Reconectando...</AlertTitle>
        <AlertDescription>
          Estableciendo conexión con el servidor.
        </AlertDescription>
      </Alert>
    );
  }

  if (!isOnline) {
    return (
      <Alert className="fixed bottom-4 left-4 right-4 z-50 bg-red-50 border-red-300">
        <WifiOff className="h-4 w-4 text-red-500 mr-2" />
        <AlertTitle>Sin conexión</AlertTitle>
        <AlertDescription>
          Trabajando en modo offline. Algunas funciones pueden no estar disponibles.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
} 