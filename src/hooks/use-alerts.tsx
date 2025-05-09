
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import AlertsContainer, { AlertType } from "@/components/AlertsContainer";

// Create a singleton for the alerts container
let alertsContainerInstance: {
  addAlert: (alert: Omit<AlertType, "id" | "timestamp">) => string;
} | null = null;
let containerInitialized = false;

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
    // If we're on the server or the container isn't ready yet, schedule the alert for later
    if (typeof window === "undefined" || !alertsContainerInstance) {
      setTimeout(() => {
        if (!containerInitialized) {
          initializeAlertsContainer();
        }
        setTimeout(() => {
          if (alertsContainerInstance) {
            alertsContainerInstance.addAlert(alert);
          }
        }, 100);
      }, 0);
      return "";
    }
    
    return alertsContainerInstance.addAlert(alert);
  };
  
  return { showAlert };
};

// Simplified version for global use without hooks
export const showGlobalAlert = (alert: Omit<AlertType, "id" | "timestamp">) => {
  if (typeof window !== "undefined") {
    if (!containerInitialized) {
      initializeAlertsContainer();
    }
    
    setTimeout(() => {
      if (alertsContainerInstance) {
        alertsContainerInstance.addAlert(alert);
      }
    }, 0);
  }
};
