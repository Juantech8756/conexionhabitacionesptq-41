import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";
import { ConnectivityBanner } from "./components/ConnectivityBanner";

// Lazy load components
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const GuestPortal = lazy(() => import("./pages/GuestPortal"));
const ReceptionLogin = lazy(() => import("./pages/ReceptionLogin"));
const ReceptionDashboardPage = lazy(() => import("./pages/ReceptionDashboardPage"));
const QrCodeDisplay = lazy(() => import("./components/QrCodeDisplay"));
const QrCodeAdminPage = lazy(() => import("./pages/QrCodeAdminPage"));

// Create a new QueryClient instance with updated configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <Toaster />
        <Sonner />
        <ConnectivityBanner />
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/guest" element={<GuestPortal />} />
            <Route path="/reception" element={<ReceptionLogin />} />
            <Route path="/reception/dashboard" element={<ReceptionDashboardPage />} />
            <Route path="/qr-code" element={<QrCodeAdminPage />} />
            <Route path="/qr-code/:roomId" element={<QrCodeDisplay />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
