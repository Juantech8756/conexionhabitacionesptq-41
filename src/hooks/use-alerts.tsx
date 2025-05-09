
import { useState } from "react";
import { createRoot } from "react-dom/client";
import AlertsContainer, { AlertType } from "@/components/AlertsContainer";

// Crear un singleton para el contenedor de alertas
let alertsContainerInstance: {
  addAlert: (alert: Omit<AlertType, "id">) => string;
} | null = null;

// Inicializa el contenedor de alertas si aún no existe
const initializeAlertsContainer = () => {
  if (!alertsContainerInstance && typeof document !== "undefined") {
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

// Hook para usar las alertas en cualquier componente
export const useAlerts = () => {
  const [, forceUpdate] = useState({});
  
  // Asegúrate de que el contenedor existe
  if (typeof window !== "undefined" && !alertsContainerInstance) {
    initializeAlertsContainer();
  }
  
  const showAlert = (alert: Omit<AlertType, "id">) => {
    // Si estamos en el servidor o el contenedor aún no está listo, programa la alerta para más tarde
    if (typeof window === "undefined" || !alertsContainerInstance) {
      setTimeout(() => {
        if (alertsContainerInstance) {
          alertsContainerInstance.addAlert(alert);
        }
      }, 100);
      return "";
    }
    
    return alertsContainerInstance.addAlert(alert);
  };
  
  return { showAlert };
};

// Versión simplificada para uso global sin hooks
export const showGlobalAlert = (alert: Omit<AlertType, "id">) => {
  if (typeof window !== "undefined") {
    initializeAlertsContainer();
    setTimeout(() => {
      if (alertsContainerInstance) {
        alertsContainerInstance.addAlert(alert);
      }
    }, 0);
  }
};

