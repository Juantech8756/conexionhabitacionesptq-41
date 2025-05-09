
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
  const [isConnected, setIsConnected] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Cleanup previous channel if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Skip if no subscriptions
    if (subscriptions.length === 0) return;

    // Create a unique channel name if not provided
    const uniqueChannelName = channelName || `realtime-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create a new channel
    let channel = supabase.channel(uniqueChannelName);

    // Add all subscriptions to the channel
    subscriptions.forEach(({ table, event, filter, filterValue, callback }) => {
      const filterObj = filter ? { [filter]: filterValue } : {};
      
      // Fix: Using the correct type assertion for the postgres_changes event
      channel = channel.on(
        'postgres_changes' as any,
        {
          event,
          schema: 'public',
          table,
          ...filterObj
        },
        callback
      );
    });

    // Subscribe to system events for connection status
    channel = channel
      .on('system', { event: 'connected' }, () => {
        console.log(`Channel ${uniqueChannelName} connected`);
        setIsConnected(true);
      })
      .on('system', { event: 'disconnected' }, () => {
        console.log(`Channel ${uniqueChannelName} disconnected`);
        setIsConnected(false);
      });

    // Subscribe to the channel
    channelRef.current = channel.subscribe((status) => {
      console.log(`Realtime subscription status: ${status}`);
      setIsConnected(status === 'SUBSCRIBED');
    });

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [subscriptions, channelName]);

  // Return connection status and a function to manually reconnect if needed
  return {
    isConnected,
    reconnect: () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      // Force effect to run again by changing a dependency
      // This is handled in the next render cycle
    }
  };
};
