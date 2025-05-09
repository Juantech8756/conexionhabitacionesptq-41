
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TemporaryAlertProps {
  title?: string;
  description: string;
  variant?: "default" | "destructive";
  duration?: number; // en milisegundos
  id: string;
  onClose: (id: string) => void;
}

const TemporaryAlert = ({
  title,
  description,
  variant = "default",
  duration = 5000, // 5 segundos por defecto
  id,
  onClose,
}: TemporaryAlertProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Configura un temporizador para ocultar la alerta después de la duración especificada
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose(id);
      }, 300); // Dar tiempo para la animación de salida
    }, duration);

    // Limpia el temporizador si el componente se desmonta
    return () => clearTimeout(timer);
  }, [duration, id, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose(id);
    }, 300); // Dar tiempo para la animación de salida
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="mb-3"
        >
          <Alert variant={variant} className="relative">
            {title && <AlertTitle>{title}</AlertTitle>}
            <AlertDescription>{description}</AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 text-gray-500 hover:text-gray-800"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </Button>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TemporaryAlert;
