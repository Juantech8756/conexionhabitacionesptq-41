
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TemporaryAlertProps {
  title?: string;
  description: string;
  variant?: "default" | "destructive";
  duration?: number; // in milliseconds
  id: string;
  onClose: (id: string) => void;
}

const TemporaryAlert = ({
  title,
  description,
  variant = "default",
  duration = 5000, // 5 seconds default
  id,
  onClose,
}: TemporaryAlertProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose(id);
      }, 300); // Give time for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, id, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose(id);
    }, 300); // Give time for exit animation
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
          <Alert variant={variant} className="relative shadow-md">
            {title && <AlertTitle>{title}</AlertTitle>}
            <AlertDescription>{description}</AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 text-gray-500 hover:text-gray-800"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TemporaryAlert;
