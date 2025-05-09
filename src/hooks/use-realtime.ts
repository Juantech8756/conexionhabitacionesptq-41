
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
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const retryTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Clean up any existing channels
    if (channelsRef.current.length > 0) {
      console.log("Cleaning up previous channels");
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    }

    // Clear any existing retry timeouts
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Skip if no subscriptions
    if (subscriptions.length === 0) return;

    // Create a channel for system events (connection status)
    const uniqueSystemChannelName = channelName || 
      `realtime-system-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    console.log(`Creating system channel: ${uniqueSystemChannelName}`);
    
    const systemChannel = supabase.channel(uniqueSystemChannelName);
    
    // Add system event listeners
    systemChannel
      .on('system', { event: 'connected' }, () => {
        console.log(`System channel connected`);
        setIsConnected(true);
      })
      .on('system', { event: 'disconnected' }, () => {
        console.log(`System channel disconnected`);
        setIsConnected(false);

        // Set up auto reconnection
        if (retryTimeoutRef.current === null) {
          retryTimeoutRef.current = window.setTimeout(() => {
            console.log('Attempting to reconnect...');
            reconnect();
            retryTimeoutRef.current = null;
          }, 3000);
        }
      })
      .subscribe((status) => {
        console.log(`System channel subscription status: ${status}`);
      });
    
    // Store the system channel
    channelsRef.current.push(systemChannel);
    
    // Create separate channels for each postgres_changes subscription
    subscriptions.forEach((subscription, index) => {
      const { table, event, filter, filterValue, callback } = subscription;
      
      const channelId = `${uniqueSystemChannelName}-pg-${table}-${event}-${index}`;
      console.log(`Creating postgres channel: ${channelId}`);
      
      const pgChannel = supabase.channel(channelId);
      
      // Prepare filter configuration if needed
      const filterConfig = filter && filterValue ? 
        { filter: `${filter}=eq.${filterValue}` } : {};
      
      console.log(`Adding subscription to ${table} for event ${event}`, 
        filter && filterValue ? filterConfig : "no filter");
      
      // Add postgres_changes event listener
      pgChannel.on(
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
      ).subscribe((status) => {
        console.log(`Postgres channel ${channelId} status: ${status}`);
      });
      
      // Store the postgres channel
      channelsRef.current.push(pgChannel);
    });

    // Cleanup function
    return () => {
      console.log(`Cleaning up all channels`);
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [subscriptions, channelName]);

  // Function to manually reconnect if needed
  const reconnect = () => {
    if (channelsRef.current.length > 0) {
      console.log("Manual reconnection triggered");
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      // This will trigger the useEffect and create new subscriptions
    }
  };

  // Return connection status and reconnect function
  return {
    isConnected,
    reconnect
  };
};
