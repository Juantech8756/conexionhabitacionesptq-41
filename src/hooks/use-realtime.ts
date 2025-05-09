
import { useState, useEffect, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';
type SubscriptionCallback = (payload: any) => void;

interface RealtimeSubscription {
  table: string;
  event: RealtimeEvent;
  filter?: string;
  filterValue?: any;
  callback: SubscriptionCallback;
}

export const useRealtime = (subscriptions: RealtimeSubscription[], channelName?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Cleanup previous channel if exists
    if (channelRef.current) {
      console.log("Cleaning up previous channel");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Clear any existing retry timeouts
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Skip if no subscriptions
    if (subscriptions.length === 0) return;

    // Create a truly unique channel name with timestamp and random string
    const uniqueChannelName = channelName || 
      `realtime-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    console.log(`Creating new realtime channel: ${uniqueChannelName}`);
    
    // Create the channel object
    const channel = supabase.channel(uniqueChannelName);

    // Register system events for connection status
    channel.on('system', { event: 'connected' }, () => {
      console.log(`Channel ${uniqueChannelName} connected`);
      setIsConnected(true);
    });

    channel.on('system', { event: 'disconnected' }, () => {
      console.log(`Channel ${uniqueChannelName} disconnected`);
      setIsConnected(false);

      // Set up automatic reconnection
      if (retryTimeoutRef.current === null) {
        retryTimeoutRef.current = window.setTimeout(() => {
          console.log('Attempting to reconnect...');
          reconnect();
          retryTimeoutRef.current = null;
        }, 3000);
      }
    });

    // Register postgres_changes subscriptions separately for each table and event
    subscriptions.forEach(({ table, event, filter, filterValue, callback }) => {
      // Prepare filter configuration if filter and filterValue are provided
      const filterConfig = filter && filterValue ? 
        { filter: `${filter}=eq.${filterValue}` } : {};
      
      console.log(`Adding subscription to ${table} for event ${event}`, 
        filter && filterValue ? filterConfig : "no filter");
      
      // Each postgres_changes subscription must be registered individually without chaining
      channel.on(
        'postgres_changes', 
        { 
          event: event,
          schema: 'public',
          table: table,
          ...filterConfig
        }, 
        (payload) => {
          console.log(`Received realtime event for ${table}:`, payload);
          callback(payload);
        }
      );
    });

    // Finally, subscribe to the channel with all events registered
    channelRef.current = channel.subscribe((status) => {
      console.log(`Realtime subscription status: ${status}`);
      setIsConnected(status === 'SUBSCRIBED');
    });

    // Cleanup function
    return () => {
      console.log(`Cleaning up channel ${uniqueChannelName}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [subscriptions, channelName]);

  // Function to manually reconnect if needed
  const reconnect = () => {
    if (channelRef.current) {
      console.log("Manual reconnection triggered");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      // This will trigger the useEffect and create a new subscription
    }
  };

  // Return connection status and reconnect function
  return {
    isConnected,
    reconnect
  };
};
