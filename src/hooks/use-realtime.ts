
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
    
    // Create dedicated connection channel with only one event type (system+connected)
    const connectionChannel = supabase.channel(`${baseChannelName}-connection`);
    connectionChannel.on(
      'system', 
      { event: 'connected' }, 
      () => {
        console.log('Connection status channel: connected');
        setIsConnected(true);
      }
    );
    connectionChannel.subscribe((status) => {
      console.log(`Connection status channel subscription status: ${status}`);
    });
    channelsRef.current.push(connectionChannel);
    
    // Create dedicated disconnection channel with only one event type (system+disconnected)
    const disconnectChannel = supabase.channel(`${baseChannelName}-disconnect`);
    disconnectChannel.on(
      'system', 
      { event: 'disconnected' }, 
      () => {
        console.log('Disconnect channel: disconnected');
        setIsConnected(false);
        
        // Set up auto reconnection
        if (retryTimeoutRef.current === null) {
          retryTimeoutRef.current = window.setTimeout(() => {
            console.log('Attempting to reconnect...');
            reconnect();
            retryTimeoutRef.current = null;
          }, 3000);
        }
      }
    );
    disconnectChannel.subscribe((status) => {
      console.log(`Disconnect channel subscription status: ${status}`);
    });
    channelsRef.current.push(disconnectChannel);
    
    // Create individual channels for each postgres_changes subscription
    subscriptions.forEach((subscription, index) => {
      const { table, event, filter, filterValue, callback } = subscription;
      
      // Create a unique name for this specific postgres channel
      const pgChannelName = `${baseChannelName}-pg-${table}-${event}-${index}`;
      console.log(`Creating postgres channel: ${pgChannelName}`);
      
      // Create a dedicated channel for this specific postgres_changes subscription
      const pgChannel = supabase.channel(pgChannelName);
      
      // Prepare filter configuration if needed
      const filterConfig = filter && filterValue ? 
        { filter: `${filter}=eq.${filterValue}` } : {};
      
      // Configure ONLY postgres_changes event on this channel (not mixed with system events)
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
      
      // Subscribe to this postgres channel
      pgChannel.subscribe((status) => {
        console.log(`Postgres channel ${pgChannelName} subscription status: ${status}`);
      });
      
      // Add to channels collection for cleanup
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
