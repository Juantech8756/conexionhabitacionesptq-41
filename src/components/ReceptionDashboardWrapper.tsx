
import { useState, useEffect } from "react";
import ReceptionDashboard from "@/components/ReceptionDashboard";
import { useNotifications } from "@/hooks/use-notifications";
import NotificationPermissionRequest from "@/components/NotificationPermissionRequest";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

interface ReceptionDashboardWrapperProps {
  onCallGuest: (guest: {id: string; name: string; roomNumber: string}) => void;
}

const ReceptionDashboardWrapper = ({ onCallGuest }: ReceptionDashboardWrapperProps) => {
  const [showNotificationsPrompt, setShowNotificationsPrompt] = useState(false);
  const { permission, isSubscribed } = useNotifications({
    type: 'reception'
  });
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if we should show notifications prompt
    if (permission !== 'granted' && permission !== 'denied' && !isSubscribed) {
      setShowNotificationsPrompt(true);
    }
  }, [permission, isSubscribed]);
  
  return (
    <div className="h-full flex flex-col">
      {/* Notification Permission Banner */}
      {showNotificationsPrompt && !isSubscribed && permission !== 'granted' && permission !== 'denied' && (
        <div className="px-4 pt-4">
          <NotificationPermissionRequest 
            type="reception"
            onPermissionChange={() => setShowNotificationsPrompt(false)}
            onDismiss={() => setShowNotificationsPrompt(false)}
          />
        </div>
      )}
      
      {/* Wrap the existing ReceptionDashboard component */}
      <ReceptionDashboard onCallGuest={onCallGuest} />
    </div>
  );
};

export default ReceptionDashboardWrapper;
