
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
const MAX_ALERTS = 3; // Maximum number of alerts to show at once
const MAX_ALERT_LIFETIME = 5000; // Force remove after 5s

const AlertsContainer = forwardRef<AlertsContainerHandle, {}>((_, ref) => {
  const [alerts, setAlerts] = useState<AlertType[]>([]);

  // Clean up expired alerts automatically every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setAlerts((prev) => {
        // Remove any alerts that have exceeded their lifetime or the maximum allowed time
        const filteredAlerts = prev.filter(alert => {
          const duration = Math.min(alert.duration || DEFAULT_DURATION, MAX_ALERT_LIFETIME);
          const expiryTime = alert.timestamp + duration;
          return now < expiryTime;
        });
        
        if (filteredAlerts.length !== prev.length) {
          return filteredAlerts;
        }
        return prev;
      });
    }, 500); // Check more frequently
    
    return () => clearInterval(interval);
  }, []);

  const addAlert = useCallback((alert: Omit<AlertType, "id" | "timestamp">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const now = Date.now();
    const duration = Math.min(alert.duration || DEFAULT_DURATION, MAX_ALERT_LIFETIME);
    
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
        console.log('Preventing duplicate alert in container:', alert);
        return prev;
      }
      
      // Special handling for cabin occupied alerts - never show multiple ones at once
      if ((alert.title?.includes("Cabaña") || alert.description?.includes("cabaña")) && 
          (alert.title?.includes("ocupada") || alert.description?.includes("ocupada"))) {
          
        // Remove any existing cabin alerts
        const withoutCabinAlerts = prev.filter(existingAlert => {
          const existingTitle = existingAlert.title || "";
          const existingDesc = existingAlert.description || "";
          return !(
            (existingTitle.includes("Cabaña") || existingDesc.includes("cabaña")) &&
            (existingTitle.includes("ocupada") || existingDesc.includes("ocupada"))
          );
        });
        
        // Limit the number of alerts
        const newAlerts = [...withoutCabinAlerts, { ...alert, id, timestamp: now, duration }];
        if (newAlerts.length > MAX_ALERTS) {
          return newAlerts.slice(newAlerts.length - MAX_ALERTS);
        }
        
        return newAlerts;
      }
      
      // Regular alert handling
      const newAlerts = [...prev, { ...alert, id, timestamp: now, duration }];
      if (newAlerts.length > MAX_ALERTS) {
        return newAlerts.slice(newAlerts.length - MAX_ALERTS);
      }
      
      return newAlerts;
    });
    
    // Safety measure: Force remove after MAX_ALERT_LIFETIME if not removed by other means
    setTimeout(() => {
      removeAlert(id);
    }, MAX_ALERT_LIFETIME + 300);
    
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
