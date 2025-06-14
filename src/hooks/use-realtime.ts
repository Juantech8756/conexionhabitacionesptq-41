import { useState, useEffect, useRef, useCallback } from "react";
import { 
  RealtimeChannel, 
  RealtimePostgresChangesPayload,
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT
} from "@supabase/supabase-js";
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
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const systemChannelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());
  const [forcedReconnect, setForcedReconnect] = useState<number>(0);

  // Create a dedicated channel for system events (connection status)
  const createSystemChannel = useCallback((uniquePrefix: string) => {
    const systemChannelName = `${uniquePrefix}-system`;
    
    // Important: For system events, use a dedicated channel with no postgres_changes
    const systemChannel = supabase.channel(systemChannelName);
    
    // Subscribe to system events for connection status
    systemChannel
      .on(REALTIME_LISTEN_TYPES.SYSTEM, { event: 'connected' }, () => {
        setIsConnected(true);
        // Reset connection attempts on successful connection
        setConnectionAttempts(0);
        // Update last event time
        lastEventTimeRef.current = Date.now();
      })
      .on(REALTIME_LISTEN_TYPES.SYSTEM, { event: 'disconnected' }, () => {
        setIsConnected(false);

        // Set up automatic reconnection with exponential backoff
        if (retryTimeoutRef.current === null) {
          const delay = Math.min(1000 * Math.pow(1.5, connectionAttempts), 10000); // Max 10s
          
          retryTimeoutRef.current = window.setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
            reconnect();
            retryTimeoutRef.current = null;
          }, delay);
        }
      })
      .subscribe((status) => {
        // Update last event time on any status change
        lastEventTimeRef.current = Date.now();
        
        // Use string comparison since status is a string value
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      });
    
    systemChannelRef.current = systemChannel;
  }, [connectionAttempts]);

  // Create separate channels for each postgres_changes subscription
  const createPostgresChannels = useCallback((uniquePrefix: string, subscriptions: RealtimeSubscription[]) => {
    subscriptions.forEach((subscription, index) => {
      const { table, event, filter, filterValue, callback } = subscription;
      
      const pgChannelName = `${uniquePrefix}-pg-${index}-${table}-${event}`;
      
      // Create a separate channel specifically for postgres changes
      const pgChannel = supabase.channel(pgChannelName);
      
      // Convert event type to Supabase's enum value
      let realtimeEvent;
      switch (event) {
        case 'INSERT':
          realtimeEvent = REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT;
          break;
        case 'UPDATE':
          realtimeEvent = REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.UPDATE;
          break;
        case 'DELETE':
          realtimeEvent = REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.DELETE;
          break;
        case '*':
          realtimeEvent = REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL;
          break;
      }
      
      // Subscribe with proper typing using Supabase constants
      pgChannel
        .on(
          REALTIME_LISTEN_TYPES.POSTGRES_CHANGES as unknown as "postgres_changes",
          {
            event: realtimeEvent,
            schema: 'public',
            table: table,
            ...(filter && filterValue ? { filter: `${filter}=eq.${filterValue}` } : {})
          },
          (payload: RealtimePostgresChangesPayload<unknown>) => {
            // Update last event timestamp to indicate we're receiving data
            lastEventTimeRef.current = Date.now();
            callback(payload);
          }
        )
        .subscribe(() => {
          // Update last event time on any status change
          lastEventTimeRef.current = Date.now();
        });
      
      // Store the channel reference for cleanup
      channelsRef.current.push(pgChannel);
    });
  }, []);

  // Function to manually reconnect if needed
  const reconnect = useCallback(() => {
    // Clean up existing channels
    channelsRef.current.forEach(channel => supabase.removeChannel(channel));
    channelsRef.current = [];
    
    if (systemChannelRef.current) {
      supabase.removeChannel(systemChannelRef.current);
      systemChannelRef.current = null;
    }
    
    // Force effect to run again by creating a new unique channel name
    const uniquePrefix = `realtime-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    createSystemChannel(uniquePrefix);
    createPostgresChannels(uniquePrefix, subscriptions);
  }, [createSystemChannel, createPostgresChannels, subscriptions]);

  useEffect(() => {
    // Cleanup previous channels if they exist
    if (channelsRef.current.length > 0) {
      channelsRef.current.forEach(channel => supabase.removeChannel(channel));
      channelsRef.current = [];
    }

    if (systemChannelRef.current) {
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

    // Setup periodic health check to force reconnect if no events received
    const healthCheckInterval = setInterval(() => {
      const timeSinceLastEvent = Date.now() - lastEventTimeRef.current;
      
      // If it's been more than 2 minutes since we got any event, force a reconnect
      if (timeSinceLastEvent > 120000) {
        setForcedReconnect(prev => prev + 1); // This will trigger a useEffect
        lastEventTimeRef.current = Date.now(); // Reset timer
      }
    }, 60000); // Check every minute

    // Cleanup function
    return () => {
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
      
      clearInterval(healthCheckInterval);
    };
  }, [subscriptions, channelName, forcedReconnect, createSystemChannel, createPostgresChannels]);

  // Return connection status and reconnect function
  return {
    isConnected,
    connectionAttempts,
    reconnect
  };
};
