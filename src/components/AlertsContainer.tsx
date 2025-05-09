
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
const MAX_ALERTS = 5; // Maximum number of alerts to show at once

const AlertsContainer = forwardRef<AlertsContainerHandle, {}>((_, ref) => {
  const [alerts, setAlerts] = useState<AlertType[]>([]);

  // Clean up expired alerts automatically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setAlerts((prev) => {
        const filteredAlerts = prev.filter(alert => {
          const expiryTime = alert.timestamp + (alert.duration || DEFAULT_DURATION) + 1000; // Add 1 second buffer
          return now < expiryTime;
        });
        
        // If we filtered some alerts, return the new array
        if (filteredAlerts.length !== prev.length) {
          return filteredAlerts;
        }
        return prev;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const addAlert = useCallback((alert: Omit<AlertType, "id" | "timestamp">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const now = Date.now();
    const duration = alert.duration || DEFAULT_DURATION;
    
    // Prevent duplicate alerts
    setAlerts((prev) => {
      // Create a unique key for this alert
      const alertKey = `${alert.title || ""}-${alert.description}`;
      
      // Check if there's an existing alert with same key
      const existingSimilar = prev.find(existingAlert => {
        const existingKey = `${existingAlert.title || ""}-${existingAlert.description}`;
        return existingKey === alertKey;
      });
      
      // Don't add duplicates
      if (existingSimilar) {
        console.log('Preventing duplicate alert:', alert);
        return prev;
      }
      
      // Limit the number of alerts by removing the oldest ones if necessary
      const newAlerts = [...prev, { ...alert, id, timestamp: now }];
      if (newAlerts.length > MAX_ALERTS) {
        return newAlerts.slice(newAlerts.length - MAX_ALERTS);
      }
      
      return newAlerts;
    });
    
    // Alerts will be auto-removed by the useEffect cleanup or via the X button
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
