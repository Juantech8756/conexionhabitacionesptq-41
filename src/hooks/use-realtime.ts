
import { useState, useEffect, useRef } from "react";
import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';
type SubscriptionCallback = (payload: RealtimePostgresChangesPayload<any>) => void;

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
  const systemChannelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Cleanup previous channels if they exist
    if (channelsRef.current.length > 0) {
      console.log(`Cleaning up ${channelsRef.current.length} previous channels`);
      channelsRef.current.forEach(channel => supabase.removeChannel(channel));
      channelsRef.current = [];
    }

    if (systemChannelRef.current) {
      console.log("Cleaning up previous system channel");
      supabase.removeChannel(systemChannelRef.current);
      systemChannelRef.current = null;
    }

    // Clear any existing retry timeouts
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Skip if no subscriptions
    if (subscriptions.length === 0) return;

    // Create a truly unique channel name prefix with timestamp and random string
    const uniquePrefix = channelName || 
      `realtime-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    
    // 1. Create a separate system channel ONLY for connection status
    createSystemChannel(uniquePrefix);
    
    // 2. Create individual channels for each postgres_changes subscription
    createPostgresChannels(uniquePrefix, subscriptions);

    // Cleanup function
    return () => {
      console.log(`Cleaning up ${channelsRef.current.length} channels and system channel`);
      
      // Clean up all postgres channels
      channelsRef.current.forEach(channel => supabase.removeChannel(channel));
      channelsRef.current = [];
      
      // Clean up system channel
      if (systemChannelRef.current) {
        supabase.removeChannel(systemChannelRef.current);
        systemChannelRef.current = null;
      }
      
      // Clear any timeouts
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [subscriptions, channelName]);

  // Create a dedicated channel for system events (connection status)
  const createSystemChannel = (uniquePrefix: string) => {
    const systemChannelName = `${uniquePrefix}-system`;
    console.log(`Creating system channel: ${systemChannelName}`);
    
    // Important: For system events, use a dedicated channel with no postgres_changes
    const systemChannel = supabase.channel(systemChannelName);
    
    // Subscribe to system events for connection status
    systemChannel
      .on('system', { event: 'connected' }, () => {
        console.log(`System channel ${systemChannelName} connected`);
        setIsConnected(true);
      })
      .on('system', { event: 'disconnected' }, () => {
        console.log(`System channel ${systemChannelName} disconnected`);
        setIsConnected(false);

        // Set up automatic reconnection
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
    
    systemChannelRef.current = systemChannel;
  };

  // Create separate channels for each postgres_changes subscription
  const createPostgresChannels = (uniquePrefix: string, subscriptions: RealtimeSubscription[]) => {
    subscriptions.forEach((subscription, index) => {
      const { table, event, filter, filterValue, callback } = subscription;
      
      const pgChannelName = `${uniquePrefix}-pg-${index}-${table}-${event}`;
      console.log(`Creating postgres channel: ${pgChannelName} for ${table}:${event}`);
      
      // Create a properly typed channel for postgres_changes
      const pgChannel = supabase.channel(pgChannelName);
      
      // Use the correct syntax for postgres_changes
      // TypeScript requires we use a specific syntax here
      const channel = pgChannel.on(
        'postgres_changes',
        {
          event: event,
          schema: 'public',
          table: table,
          ...(filter && filterValue ? { filter: `${filter}=eq.${filterValue}` } : {})
        },
        (payload) => {
          console.log(`Received realtime event for ${table}:`, payload);
          callback(payload);
        }
      );
      
      // Subscribe to the channel
      channel.subscribe((status) => {
        console.log(`Postgres channel ${pgChannelName} subscription status: ${status}`);
      });
      
      // Store the channel reference for cleanup
      channelsRef.current.push(pgChannel);
    });
  };

  // Function to manually reconnect if needed
  const reconnect = () => {
    console.log("Manual reconnection triggered");
    
    // Clean up existing channels
    channelsRef.current.forEach(channel => supabase.removeChannel(channel));
    channelsRef.current = [];
    
    if (systemChannelRef.current) {
      supabase.removeChannel(systemChannelRef.current);
      systemChannelRef.current = null;
    }
    
    // Force effect to run again by creating a new unique channel name
    // This will be done on next render since we are not updating any state here
  };

  // Return connection status and reconnect function
  return {
    isConnected,
    reconnect
  };
};
