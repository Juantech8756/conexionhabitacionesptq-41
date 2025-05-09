
import React, { useState, useCallback, forwardRef, useImperativeHandle } from "react";
import TemporaryAlert from "./TemporaryAlert";

export type AlertType = {
  id: string;
  title?: string;
  description: string;
  variant?: "default" | "destructive";
  duration?: number;
};

export interface AlertsContainerHandle {
  addAlert: (alert: Omit<AlertType, "id">) => string;
  removeAlert: (id: string) => void;
}

const AlertsContainer = forwardRef<AlertsContainerHandle, {}>((_, ref) => {
  const [alerts, setAlerts] = useState<AlertType[]>([]);

  const addAlert = useCallback((alert: Omit<AlertType, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setAlerts((prev) => [...prev, { ...alert, id }]);
    return id;
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  // Exponer los métodos a través de la referencia
  useImperativeHandle(ref, () => ({
    addAlert,
    removeAlert
  }));

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      {alerts.map((alert) => (
        <TemporaryAlert
          key={alert.id}
          id={alert.id}
          title={alert.title}
          description={alert.description}
          variant={alert.variant}
          duration={alert.duration}
          onClose={removeAlert}
        />
      ))}
    </div>
  );
});

AlertsContainer.displayName = "AlertsContainer";

export default AlertsContainer;
