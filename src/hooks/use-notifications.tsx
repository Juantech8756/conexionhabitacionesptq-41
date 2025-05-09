import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showGlobalAlert } from "@/hooks/use-alerts";

// Updated interface to match Supabase column names (lowercase)
export interface NotificationSubscription {
  id?: string;
  userid?: string; // Changed from userId to match database column
  guestid?: string; // Changed from guestId to match database column
  endpoint: string;
  p256dh: string;
  auth: string;
  useragent?: string; // Changed from userAgent to match database column
  created_at?: string;
  roomid?: string; // Changed from roomId to match database column
  roomnumber?: string; // Changed from roomNumber to match database column
}

interface UseNotificationsOptions {
  type: 'guest' | 'reception';
  guestId?: string;
  roomId?: string;
  roomNumber?: string;
}

// Check if push notification support is available
const isPushNotificationSupported = () => {
  return 'serviceWorker' in navigator && 
         'PushManager' in window &&
         'Notification' in window;
};

export const useNotifications = (options: UseNotificationsOptions) => {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  
  // Initialize state on component mount
  useEffect(() => {
    const checkPermission = async () => {
      setIsSupported(isPushNotificationSupported());
      
      if (!isPushNotificationSupported()) {
        console.log('Push notifications not supported');
        return;
      }
      
      // Check current permission
      if ('permissions' in navigator) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'notifications' as PermissionName });
          setPermission(permissionStatus.state as NotificationPermission);
          
          // Listen for permission changes
          permissionStatus.onchange = () => {
            setPermission(permissionStatus.state as NotificationPermission);
          };
        } catch (error) {
          console.error('Error checking notification permission:', error);
          setPermission(Notification.permission);
        }
      } else {
        setPermission(Notification.permission);
      }
      
      // Check if already subscribed
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const existingSubscription = await registration.pushManager.getSubscription();
            setSubscription(existingSubscription);
            setIsSubscribed(!!existingSubscription);
          }
        } catch (error) {
          console.error('Error checking subscription:', error);
        }
      }
    };
    
    checkPermission();
  }, []);
  
  // Request permission for notifications
  const requestPermission = async (): Promise<boolean> => {
    if (!isPushNotificationSupported()) {
      showGlobalAlert({
        title: "Notificaciones no soportadas",
        description: "Su navegador no soporta notificaciones push. Use un navegador moderno como Chrome.",
        duration: 5000
      });
      return false;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        return await subscribeUserToPush();
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };
  
  // Subscribe user to push notifications
  const subscribeUserToPush = async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Generate VAPID key pair (in a real application, this would come from your server)
      // For simplicity, we'll use a placeholder here
      const publicVapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });
      
      setSubscription(subscription);
      setIsSubscribed(true);
      
      // Save subscription to database
      await saveSubscriptionToDatabase(subscription);
      
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  };
  
  // Convert base64 string to Uint8Array for applicationServerKey
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  };
  
  // Save subscription to database
  const saveSubscriptionToDatabase = async (subscription: PushSubscription) => {
    if (!subscription) return;
    
    try {
      const subscriptionJSON = subscription.toJSON();
      const { endpoint, keys } = subscriptionJSON;
      
      if (!keys || !keys.p256dh || !keys.auth) {
        console.error('Invalid subscription, missing keys');
        return;
      }
      
      // Create subscription object with correct column names
      const subscriptionData: NotificationSubscription = {
        endpoint: endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        useragent: navigator.userAgent, // Changed from userAgent to useragent
      };
      
      // Add extra data based on type
      if (options.type === 'guest') {
        subscriptionData.guestid = options.guestId; // Changed from guestId to guestid
        subscriptionData.roomid = options.roomId; // Changed from roomId to roomid
        subscriptionData.roomnumber = options.roomNumber; // Changed from roomNumber to roomnumber
      } else if (options.type === 'reception') {
        // Get the user ID from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          subscriptionData.userid = user.id; // Changed from userId to userid
        }
      }
      
      // Insert with correct column names
      const { error } = await supabase
        .from('notification_subscriptions')
        .insert([subscriptionData]);
        
      if (error) {
        console.error('Error inserting subscription:', error);
      } else {
        console.log('Subscription saved to database');
      }
    } catch (error) {
      console.error('Error saving subscription to database:', error);
    }
  };
  
  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    if (!subscription) return;
    
    try {
      await subscription.unsubscribe();
      setSubscription(null);
      setIsSubscribed(false);
      
      // Remove from database with correct column names
      if (options.type === 'guest' && options.guestId) {
        const { error } = await supabase
          .from('notification_subscriptions')
          .delete()
          .eq('guestid', options.guestId) // Changed from guestId to guestid
          .eq('endpoint', subscription.endpoint);
          
        if (error) {
          console.error('Error removing subscription:', error);
        }
      } else if (options.type === 'reception') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from('notification_subscriptions')
            .delete()
            .eq('userid', user.id) // Changed from userId to userid
            .eq('endpoint', subscription.endpoint);
            
          if (error) {
            console.error('Error removing subscription:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }
  };
  
  // Send a test notification
  const sendTestNotification = () => {
    if (!isSupported || permission !== 'granted') return;
    
    const options = {
      body: 'Esta es una notificación de prueba',
      icon: '/favicon.ico',
      badge: '/icon-192.png',
    };
    
    new Notification('Prueba de Notificación', options);
  };
  
  return {
    isSupported,
    permission,
    isSubscribed,
    requestPermission,
    unsubscribe,
    sendTestNotification
  };
};

// Helper function to test if notifications are working
export const showNotification = (title: string, options = {}) => {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return;
  }
  
  if (Notification.permission === 'granted') {
    new Notification(title, options);
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, options);
      }
    });
  }
};
