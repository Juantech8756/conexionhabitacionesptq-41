import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para monitorear la conectividad de red y reconectar a Supabase cuando sea necesario
 * Esto permitirá que la aplicación siga funcionando cuando pase de online a offline y viceversa
 */
export function useConnectivity() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [reconnecting, setReconnecting] = useState<boolean>(false);

  // Función para reconectar a Supabase
  const reconnectToSupabase = async () => {
    if (!isOnline) return;
    
    try {
      setReconnecting(true);
      
      // Renovar la conexión con Supabase
      const { error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error al reconectar a Supabase:', error);
        // Intentar de nuevo después de un tiempo
        setTimeout(reconnectToSupabase, 5000);
      } else {
        console.log('Reconectado a Supabase exitosamente');
      }
    } catch (err) {
      console.error('Error inesperado al reconectar:', err);
    } finally {
      setReconnecting(false);
    }
  };

  useEffect(() => {
    // Manejadores para conectividad de red
    const handleOnline = () => {
      setIsOnline(true);
      reconnectToSupabase();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Agregar event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar conectividad inicial
    if (isOnline) {
      reconnectToSupabase();
    }

    // Limpiar event listeners al desmontar
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  return { isOnline, reconnecting };
} 