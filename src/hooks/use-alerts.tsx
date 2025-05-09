
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import AlertsContainer, { AlertType } from "@/components/AlertsContainer";

// Create a singleton for the alerts container
let alertsContainerInstance: {
  addAlert: (alert: Omit<AlertType, "id" | "timestamp">) => string;
  removeAlert: (id: string) => void;
} | null = null;
let containerInitialized = false;

// Storage of recent alerts to prevent duplicates
const recentAlertDescriptions = new Set<string>();
const MAX_ALERT_LIFETIME = 5000; // Maximum lifetime for any alert (5 seconds)

// Initialize the alerts container if it doesn't exist yet
const initializeAlertsContainer = () => {
  if (!containerInitialized && typeof document !== "undefined") {
    containerInitialized = true;
    const containerId = "global-alerts-container";
    let container = document.getElementById(containerId);
    
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      document.body.appendChild(container);
    }
    
    const containerRef = { current: null as any };
    const root = createRoot(container);
    
    root.render(
      <AlertsContainer 
        ref={(ref: any) => {
          containerRef.current = ref;
          if (ref && typeof ref.addAlert === "function") {
            alertsContainerInstance = ref;
          }
        }} 
      />
    );
  }
};

// Hook to use alerts in any component
export const useAlerts = () => {
  // Make sure container exists
  useEffect(() => {
    if (typeof window !== "undefined" && !alertsContainerInstance) {
      initializeAlertsContainer();
    }
  }, []);
  
  const showAlert = (alert: Omit<AlertType, "id" | "timestamp">) => {
    // Enforce maximum duration - shorter to avoid persistent alerts
    const duration = Math.min(alert.duration || 5000, MAX_ALERT_LIFETIME);
    const alertWithLimit = { ...alert, duration };
    
    // Global level alert deduplication
    const alertKey = `${alert.title || ""}-${alert.description}`;
    
    // Special handling for cabin occupied alerts - don't show repeatedly
    if (alertKey.includes("Cabaña") && alertKey.includes("ocupada")) {
      // Only show once per session by storing in sessionStorage
      const sessionKey = `cabin-alert-${alertKey}`;
      if (sessionStorage.getItem(sessionKey)) {
        console.log("Preventing duplicate cabin alert:", alertKey);
        return "";
      }
      sessionStorage.setItem(sessionKey, "shown");
    }
    // Regular deduplication for other alerts
    else if (recentAlertDescriptions.has(alertKey)) {
      console.log("Preventing duplicate alert:", alertKey);
      return "";
    }
    
    // Add to recent alerts
    recentAlertDescriptions.add(alertKey);
    
    // Auto-clear from recent alerts after expiry - shorter time
    setTimeout(() => {
      recentAlertDescriptions.delete(alertKey);
    }, duration);
    
    // If we're on the server or the container isn't ready yet, schedule the alert for later
    if (typeof window === "undefined" || !alertsContainerInstance) {
      setTimeout(() => {
        if (!containerInitialized) {
          initializeAlertsContainer();
        }
        setTimeout(() => {
          if (alertsContainerInstance) {
            alertsContainerInstance.addAlert(alertWithLimit);
          }
        }, 100);
      }, 0);
      return "";
    }
    
    return alertsContainerInstance.addAlert(alertWithLimit);
  };
  
  return { showAlert };
};

// Simplified version for global use without hooks
export const showGlobalAlert = (alert: Omit<AlertType, "id" | "timestamp">) => {
  if (typeof window !== "undefined") {
    // Enforce maximum duration - shorter to avoid persistent alerts
    const duration = Math.min(alert.duration || 5000, MAX_ALERT_LIFETIME);
    const alertWithLimit = { ...alert, duration };
    
    // Global level alert deduplication
    const alertKey = `${alert.title || ""}-${alert.description}`;
    
    // Special handling for cabin occupied alerts
    if (alertKey.includes("Cabaña") && alertKey.includes("ocupada")) {
      // Only show once per session by storing in sessionStorage
      const sessionKey = `cabin-alert-${alertKey}`;
      if (sessionStorage.getItem(sessionKey)) {
        console.log("Preventing duplicate cabin alert:", alertKey);
        return;
      }
      sessionStorage.setItem(sessionKey, "shown");
    }
    // Regular deduplication for other alerts
    else if (recentAlertDescriptions.has(alertKey)) {
      console.log("Preventing duplicate global alert:", alertKey);
      return;
    }
    
    // Add to recent alerts
    recentAlertDescriptions.add(alertKey);
    
    // Auto-clear from recent alerts after expiry
    setTimeout(() => {
      recentAlertDescriptions.delete(alertKey);
    }, duration);
    
    if (!containerInitialized) {
      initializeAlertsContainer();
    }
    
    setTimeout(() => {
      if (alertsContainerInstance) {
        alertsContainerInstance.addAlert(alertWithLimit);
      }
    }, 0);
  }
};
