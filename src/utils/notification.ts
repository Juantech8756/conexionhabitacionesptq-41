
import { supabase } from "@/integrations/supabase/client";

// Type for sending notifications
interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: {
    type: 'guest-message' | 'reception-message';
    guestId?: string;
    roomId?: string;
    roomNumber?: string;
    url?: string;
  };
}

// Function to send notification to specific guest
export const sendNotificationToGuest = async (
  guestId: string,
  notification: NotificationPayload
) => {
  try {
    // Call the edge function to send the notification
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        targetType: 'guest',
        targetId: guestId,
        notification
      }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sending notification to guest:', error);
    return null;
  }
};

// Function to send notification to reception
export const sendNotificationToReception = async (
  notification: NotificationPayload
) => {
  try {
    // Call the edge function to send the notification
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        targetType: 'reception',
        notification
      }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error sending notification to reception:', error);
    return null;
  }
};

// Function to format a message notification
export const formatMessageNotification = (
  isGuest: boolean,
  message: string,
  guestName: string,
  roomNumber: string,
  guestId: string = '',
  roomId: string = ''
): NotificationPayload => {
  if (isGuest) {
    // Format notification for reception
    return {
      title: `Nuevo mensaje de Cabaña ${roomNumber}`,
      body: `${guestName}: ${message}`,
      data: {
        type: 'reception-message',
        guestId,
        roomNumber,
        url: `/reception/dashboard?guestId=${guestId}`
      }
    };
  } else {
    // Format notification for guest
    return {
      title: 'Nuevo mensaje de Recepción',
      body: message,
      data: {
        type: 'guest-message',
        guestId,
        roomId,
        roomNumber,
        url: `/guest?roomId=${roomId}`
      }
    };
  }
};
