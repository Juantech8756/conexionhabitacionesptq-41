
import React, { useState, useCallback, forwardRef, useImperativeHandle, useEffect } from "react";
import TemporaryAlert from "./TemporaryAlert";

export type AlertType = {
  id: string;
  title?: string;
  description: string;
  variant?: "default" | "destructive";
  duration?: number;
  timestamp: number;
};

export interface AlertsContainerHandle {
  addAlert: (alert: Omit<AlertType, "id" | "timestamp">) => string;
  removeAlert: (id: string) => void;
}

const DEFAULT_DURATION = 5000; // 5 seconds default

const AlertsContainer = forwardRef<AlertsContainerHandle, {}>((_, ref) => {
  const [alerts, setAlerts] = useState<AlertType[]>([]);

  // Clean up expired alerts automatically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setAlerts((prev) => prev.filter(alert => {
        const expiryTime = alert.timestamp + (alert.duration || DEFAULT_DURATION);
        return now < expiryTime;
      }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const addAlert = useCallback((alert: Omit<AlertType, "id" | "timestamp">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const now = Date.now();
    const duration = alert.duration || DEFAULT_DURATION;
    
    // Super aggressive duplicate prevention - check for exact matches or even contains
    setAlerts((prev) => {
      // Check if there's an existing alert with same title OR description
      const existingSimilar = prev.find(
        existingAlert => 
          (alert.title && existingAlert.title === alert.title) || 
          (alert.description && existingAlert.description.includes(alert.description)) ||
          (alert.description && alert.description.includes(existingAlert.description))
      );
      
      // Don't add duplicates
      if (existingSimilar) {
        console.log('Preventing duplicate alert:', alert);
        return prev;
      }
      
      return [...prev, { ...alert, id, timestamp: now }];
    });
    
    // Auto-remove after duration
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, duration);
    
    return id;
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  // Expose methods through the reference
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
