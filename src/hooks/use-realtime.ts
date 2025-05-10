
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
    
    // Create a channel just for the "connected" system event
    const connectedChannel = supabase.channel(`${baseChannelName}-connected`);
    connectedChannel.on(
      'system',
      { event: 'connected' }, 
      () => {
        console.log('Connected system event received');
        setIsConnected(true);
      }
    ).subscribe((status) => {
      console.log(`Connected channel status: ${status}`);
    });
    channelsRef.current.push(connectedChannel);
    
    // Create a separate channel just for the "disconnected" system event
    const disconnectedChannel = supabase.channel(`${baseChannelName}-disconnected`);
    disconnectedChannel.on(
      'system',
      { event: 'disconnected' }, 
      () => {
        console.log('Disconnected system event received');
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
    ).subscribe((status) => {
      console.log(`Disconnected channel status: ${status}`);
    });
    channelsRef.current.push(disconnectedChannel);
    
    // Create individual channels for each postgres_changes subscription
    subscriptions.forEach((subscription, index) => {
      const { table, event, filter, filterValue, callback } = subscription;
      
      // Each postgres_changes subscription gets its own dedicated channel
      const channelName = `${baseChannelName}-pg-${table}-${event}-${index}`;
      const channel = supabase.channel(channelName);
      
      // Prepare filter configuration if needed
      const filterConfig = filter && filterValue ? 
        { filter: `${filter}=eq.${filterValue}` } : {};
      
      // Only configure postgres_changes event on this channel
      channel.on(
        'postgres_changes',
        {
          event: event,
          schema: 'public',
          table: table,
          ...filterConfig
        },
        (payload) => {
          console.log(`Received ${event} event for ${table}:`, payload);
          callback(payload);
        }
      ).subscribe((status) => {
        console.log(`Postgres channel ${channelName} status: ${status}`);
      });
      
      channelsRef.current.push(channel);
    });

    // Cleanup function
    return () => {
      console.log("Cleaning up all channels");
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
