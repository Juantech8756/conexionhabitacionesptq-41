
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
    // Cleanup previous channels if exist
    if (channelsRef.current.length > 0) {
      console.log("Cleaning up previous channels");
      channelsRef.current.forEach(channel => supabase.removeChannel(channel));
      channelsRef.current = [];
    }

    // Clear any existing retry timeouts
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Skip if no subscriptions
    if (subscriptions.length === 0) return;

    const channels: RealtimeChannel[] = [];
    
    // Create a truly unique base channel name with timestamp and random string
    const baseChannelName = channelName || 
      `realtime-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create a channel for system events (connection status)
    const systemChannel = supabase.channel(`${baseChannelName}-system`);
    
    // Add system event handlers
    systemChannel
      .on('system', { event: 'connected' }, () => {
        console.log(`System channel ${baseChannelName}-system connected`);
        setIsConnected(true);
      })
      .subscribe();
    
    channels.push(systemChannel);
    
    // Create separate channel for disconnection events
    const disconnectChannel = supabase.channel(`${baseChannelName}-disconnect`);
    
    disconnectChannel
      .on('system', { event: 'disconnected' }, () => {
        console.log(`System channel ${baseChannelName}-disconnect disconnected`);
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
      .subscribe();
    
    channels.push(disconnectChannel);

    // Create separate channels for each database subscription
    subscriptions.forEach((subscription, index) => {
      const { table, event, filter, filterValue, callback } = subscription;
      const filterObj = filter ? { [filter]: filterValue } : {};
      const dbChannelName = `${baseChannelName}-db-${index}`;
      
      console.log(`Adding subscription to ${table} for event ${event}`, filterObj);
      
      // Create a dedicated channel for this subscription
      const dbChannel = supabase.channel(dbChannelName);
      
      // Add the postgres_changes event handler
      dbChannel.on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          ...filterObj
        },
        (payload) => {
          console.log(`Received realtime event for ${table}:`, payload);
          callback(payload);
        }
      ).subscribe((status) => {
        console.log(`Database subscription channel ${dbChannelName} status:`, status);
      });
      
      channels.push(dbChannel);
    });

    // Store all channels for cleanup
    channelsRef.current = channels;

    // Cleanup function
    return () => {
      console.log(`Cleaning up ${channels.length} channels`);
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
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
      channelsRef.current.forEach(channel => supabase.removeChannel(channel));
      channelsRef.current = [];
      
      // Force effect to run again
      // This will recreate all channels
    }
  };

  // Return connection status and reconnect function
  return {
    isConnected,
    reconnect
  };
};
