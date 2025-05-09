
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import AlertsContainer, { AlertType } from "@/components/AlertsContainer";

// Create a singleton for the alerts container
let alertsContainerInstance: {
  addAlert: (alert: Omit<AlertType, "id" | "timestamp">) => string;
  removeAlert: (id: string) => void;
} | null = null;
let containerInitialized = false;

// Storage of recent alerts to prevent duplicates - use a Map for better control
const recentAlertMap = new Map<string, number>();
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

// Helper to check if an alert should be shown or suppressed
const shouldShowAlert = (alertKey: string, duration: number): boolean => {
  const now = Date.now();
  
  // Special handling for cabin occupied alerts - check storage first
  if (alertKey.includes("Cabaña") && alertKey.includes("ocupada")) {
    const sessionKey = `cabin-alert-${alertKey}`;
    // Completely suppress these alerts if they've been shown once in this session
    if (sessionStorage.getItem(sessionKey)) {
      console.log("Completely suppressing duplicate cabin alert:", alertKey);
      return false;
    }
    // Mark as shown in session storage - until browser tab is closed/refreshed
    sessionStorage.setItem(sessionKey, now.toString());
  }
  
  // Regular deduplication for any alert
  if (recentAlertMap.has(alertKey)) {
    console.log("Suppressing duplicate alert:", alertKey);
    return false;
  }
  
  // Record this alert with timestamp
  recentAlertMap.set(alertKey, now);
  
  // Schedule cleanup
  setTimeout(() => {
    const timestamp = recentAlertMap.get(alertKey);
    // Only delete if it's the same timestamp (avoid race conditions)
    if (timestamp === now) {
      recentAlertMap.delete(alertKey);
    }
  }, duration);
  
  return true;
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
    // Enforce maximum duration
    const duration = Math.min(alert.duration || 5000, MAX_ALERT_LIFETIME);
    const alertWithLimit = { ...alert, duration };
    
    // Generate alert key
    const alertKey = `${alert.title || ""}-${alert.description}`;
    
    // Check if we should show this alert
    if (!shouldShowAlert(alertKey, duration)) {
      return "";
    }
    
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
    // Enforce maximum duration
    const duration = Math.min(alert.duration || 5000, MAX_ALERT_LIFETIME);
    const alertWithLimit = { ...alert, duration };
    
    // Generate alert key
    const alertKey = `${alert.title || ""}-${alert.description}`;
    
    // Check if we should show this alert
    if (!shouldShowAlert(alertKey, duration)) {
      return;
    }
    
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
