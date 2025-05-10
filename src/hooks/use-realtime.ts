
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

    // Generate a unique base name for this set of channels
    const baseChannelName = channelName || 
      `realtime-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // IMPORTANT: We need to create separate channels for each purpose
    // 1. Create a dedicated channel ONLY for system events
    const systemChannel = supabase.channel(`${baseChannelName}-system`);
    
    console.log(`Creating system channel: ${baseChannelName}-system`);
    
    // Set up system events on their own dedicated channel
    systemChannel
      .on('system', { event: 'connected' }, () => {
        console.log(`System channel connected`);
        setIsConnected(true);
      });
    
    // Subscribe to the system channel
    systemChannel.subscribe((status) => {
      console.log(`System channel subscription status: ${status}`);
    });
    
    // Add disconnect handling on a separate channel subscription
    // This must be separate in Supabase 2.49.4 due to typings
    const disconnectChannel = supabase.channel(`${baseChannelName}-disconnect`);
    
    disconnectChannel
      .on('system', { event: 'disconnected' }, () => {
        console.log(`System disconnected`);
        setIsConnected(false);

        // Set up auto reconnection
        if (retryTimeoutRef.current === null) {
          retryTimeoutRef.current = window.setTimeout(() => {
            console.log('Attempting to reconnect...');
            reconnect();
            retryTimeoutRef.current = null;
          }, 3000);
        }
      });
    
    // Subscribe to the disconnect channel
    disconnectChannel.subscribe((status) => {
      console.log(`Disconnect channel subscription status: ${status}`);
    });
    
    // Store both system channels for cleanup
    channelsRef.current.push(systemChannel);
    channelsRef.current.push(disconnectChannel);
    
    // 2. Create individual channels for each postgres_changes subscription
    // Each postgres subscription MUST have its own dedicated channel with a single `.on()` call
    subscriptions.forEach((subscription, index) => {
      const { table, event, filter, filterValue, callback } = subscription;
      
      // Create a unique name for this specific postgres channel
      const pgChannelName = `${baseChannelName}-pg-${table}-${event}-${index}`;
      console.log(`Creating postgres channel: ${pgChannelName}`);
      
      // Create a dedicated channel just for this specific postgres_changes subscription
      const pgChannel = supabase.channel(pgChannelName);
      
      // Prepare filter configuration if needed
      const filterConfig = filter && filterValue ? 
        { filter: `${filter}=eq.${filterValue}` } : {};
      
      console.log(`Adding subscription to ${table} for event ${event}`, 
        filter && filterValue ? filterConfig : "no filter");
      
      // CRITICAL: Each postgres_changes subscription requires its own
      // dedicated channel and immediate subscribe call
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
      );
      
      // We must subscribe immediately after the .on() call
      pgChannel.subscribe((status) => {
        console.log(`Postgres channel ${pgChannelName} subscription status: ${status}`);
      });
      
      // Store the postgres channel for cleanup
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
