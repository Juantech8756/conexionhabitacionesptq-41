
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import GuestPortal from "./pages/GuestPortal";
import ReceptionLogin from "./pages/ReceptionLogin";
import ReceptionDashboardPage from "./pages/ReceptionDashboardPage";
import QrCodeDisplay from "./components/QrCodeDisplay";
import QrCodeAdminPage from "./pages/QrCodeAdminPage";
import GuestSimulation from "./pages/GuestSimulation";

// Create a new QueryClient instance
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/guest" element={<GuestPortal />} />
          <Route path="/guest-simulation" element={<GuestSimulation />} />
          <Route path="/reception" element={<ReceptionLogin />} />
          <Route path="/reception/dashboard" element={<ReceptionDashboardPage />} />
          <Route path="/qr-code" element={<QrCodeAdminPage />} />
          <Route path="/qr-code/:roomId" element={<QrCodeDisplay />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
