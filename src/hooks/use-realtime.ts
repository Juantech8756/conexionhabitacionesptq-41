import { useState, useEffect, useRef } from "react";
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

interface UseRealtimeOptions {
  inactivityTimeout?: number; // Timeout in milliseconds before auto-disconnect
  reconnectAttempts?: number; // Max number of reconnection attempts
  debugMode?: boolean; // Enable detailed logging
  deduplicationEnabled?: boolean; // New option to enable message deduplication
}

// Default options
const DEFAULT_OPTIONS: UseRealtimeOptions = {
  inactivityTimeout: 15 * 60 * 1000, // 15 minutes
  reconnectAttempts: 5,
  debugMode: false,
  deduplicationEnabled: true, // Enable deduplication by default
};

// Keep track of all active channels to prevent duplicate subscriptions
const activeChannels: Record<string, RealtimeChannel> = {};

export const useRealtime = (
  subscriptions: RealtimeSubscription[], 
  channelName?: string,
  options?: UseRealtimeOptions
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<number | null>(null);
  const [forcedReconnect, setForcedReconnect] = useState<number>(0);
  const subscribedTablesRef = useRef<Set<string>>(new Set());
  const processedEventsRef = useRef<Set<string>>(new Set()); // For deduplication
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // Log helper that respects debug mode setting
  const log = (message: string, data?: any) => {
    if (mergedOptions.debugMode) {
      if (data) {
        console.log(`[Realtime] ${message}`, data);
      } else {
        console.log(`[Realtime] ${message}`);
      }
    }
  };

  // Start or reset the inactivity timer
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    if (mergedOptions.inactivityTimeout) {
      inactivityTimerRef.current = window.setTimeout(() => {
        log("Inactivity timeout reached, disconnecting...");
        disconnect();
      }, mergedOptions.inactivityTimeout);
    }
  };

  // Update activity timestamp and reset timer
  const updateActivity = () => {
    lastEventTimeRef.current = Date.now();
    resetInactivityTimer();
  };
  
  // Disconnect function
  const disconnect = () => {
    if (channelRef.current) {
      log("Manually disconnecting channel");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
      
      // Also remove from active channels registry
      if (channelName) {
        delete activeChannels[channelName];
      }
    }
  };

  // Process subscription callback with deduplication if enabled
  const processCallback = (subscription: RealtimeSubscription, payload: RealtimePostgresChangesPayload<any>) => {
    // Generate a unique event ID for deduplication
    // Fix TypeScript error by safely accessing id property with optional chaining and type checking
    const recordId = (payload.new && 'id' in payload.new ? payload.new.id : 
                      payload.old && 'id' in payload.old ? payload.old.id : 
                      null) || Date.now().toString();
                      
    const eventId = `${payload.schema}-${payload.table}-${payload.eventType}-${recordId}`;
    
    // Check if we've already processed this event
    if (mergedOptions.deduplicationEnabled && processedEventsRef.current.has(eventId)) {
      log(`Skipping duplicate event: ${eventId}`);
      return;
    }
    
    // Add to processed events (with TTL for cleanup)
    if (mergedOptions.deduplicationEnabled) {
      processedEventsRef.current.add(eventId);
      
      // Clean up event ID after 5 seconds
      setTimeout(() => {
        processedEventsRef.current.delete(eventId);
      }, 5000);
    }
    
    // Call the actual callback
    try {
      subscription.callback(payload);
      updateActivity();
    } catch (error) {
      console.error(`[Realtime] Error in subscription callback:`, error);
    }
  };

  useEffect(() => {
    // Generate a unique channel name if none provided
    const uniqueName = channelName || 
      `realtime-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    
    // Check if this channel already exists
    if (channelName && activeChannels[channelName]) {
      log(`Channel already exists, reusing: ${channelName}`);
      channelRef.current = activeChannels[channelName];
      setIsConnected(true);
      return;
    }
    
    // Clean up previous channel if it exists
    if (channelRef.current) {
      log(`Cleaning up previous channel: ${uniqueName}`);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      subscribedTablesRef.current.clear();
    }

    // Clear any existing retry timeouts
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    // Clear inactivity timer
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    // Skip if no subscriptions
    if (subscriptions.length === 0) return;
    
    log(`Creating consolidated channel: ${uniqueName}`);
    
    // Create a single channel for all subscriptions
    const channel = supabase.channel(uniqueName);
    
    // Add system event listeners for connection status
    channel
      .on(REALTIME_LISTEN_TYPES.SYSTEM, { event: 'connected' }, () => {
        log(`Channel connected: ${uniqueName}`);
        setIsConnected(true);
        setConnectionAttempts(0);
        updateActivity();
      })
      .on(REALTIME_LISTEN_TYPES.SYSTEM, { event: 'disconnected' }, () => {
        log(`Channel disconnected: ${uniqueName}`);
        setIsConnected(false);

        // Set up automatic reconnection with exponential backoff
        if (retryTimeoutRef.current === null && 
            connectionAttempts < (mergedOptions.reconnectAttempts || 5)) {
          const delay = Math.min(1000 * Math.pow(1.5, connectionAttempts), 10000); // Max 10s
          log(`Will attempt to reconnect in ${delay}ms (attempt ${connectionAttempts + 1})`);
          
          retryTimeoutRef.current = window.setTimeout(() => {
            log('Attempting to reconnect...');
            setConnectionAttempts(prev => prev + 1);
            reconnect();
            retryTimeoutRef.current = null;
          }, delay);
        }
      });
      
    // Add all postgres change listeners
    subscriptions.forEach((subscription, index) => {
      const { table, event, filter, filterValue, callback } = subscription;
      
      // Convert event type to Supabase's enum value
      let realtimeEvent: any;
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
      
      // Create a unique key for this subscription
      const subKey = `${table}-${event}-${filter || 'nofilter'}-${filterValue || 'novalue'}`;
      
      // Only add if we haven't already subscribed to this exact combination
      if (!subscribedTablesRef.current.has(subKey)) {
        log(`Adding subscription for ${table}:${event}`, 
            filter ? `with filter ${filter}=eq.${filterValue}` : 'without filter');
        
        channel.on(
          REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
          {
            event: realtimeEvent,
            schema: 'public',
            table: table,
            ...(filter && filterValue ? { filter: `${filter}=eq.${filterValue}` } : {})
          },
          (payload) => processCallback(subscription, payload)
        );
        
        // Mark this subscription as added
        subscribedTablesRef.current.add(subKey);
      } else {
        log(`Skipping duplicate subscription for ${table}:${event}`);
      }
    });

    // Subscribe to the channel
    channel.subscribe((status) => {
      log(`Channel subscription status: ${status}`);
      updateActivity();
      
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
      }
    });
    
    // Store the channel reference
    channelRef.current = channel;
    
    // Register in active channels registry
    if (channelName) {
      activeChannels[channelName] = channel;
    }
    
    // Start the inactivity timer
    resetInactivityTimer();
    
    // Setup periodic health check
    const healthCheckInterval = setInterval(() => {
      const timeSinceLastEvent = Date.now() - lastEventTimeRef.current;
      
      // If it's been more than 2 minutes since any event, force a reconnect
      if (timeSinceLastEvent > 120000 && isConnected) {
        log("No events received for 2+ minutes, forcing reconnect");
        setForcedReconnect(prev => prev + 1); // This will trigger a useEffect
        lastEventTimeRef.current = Date.now(); // Reset timer
      }
    }, 60000); // Check every minute

    // Cleanup function
    return () => {
      log(`Cleaning up channel: ${uniqueName}`);
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        
        // Also remove from active channels registry
        if (channelName) {
          delete activeChannels[channelName];
        }
        
        channelRef.current = null;
      }
      
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      
      clearInterval(healthCheckInterval);
    };
  }, [subscriptions, channelName, forcedReconnect, mergedOptions.reconnectAttempts, mergedOptions.inactivityTimeout, mergedOptions.debugMode, mergedOptions.deduplicationEnabled]);

  // Function to manually reconnect
  const reconnect = () => {
    log("Manual reconnection triggered");
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      
      // Also remove from active channels registry
      if (channelName) {
        delete activeChannels[channelName];
      }
      
      channelRef.current = null;
    }
    
    subscribedTablesRef.current.clear();
    setForcedReconnect(prev => prev + 1); // This will trigger the useEffect to create a new channel
  };

  // Return connection status, reconnect function and disconnect function
  return {
    isConnected,
    connectionAttempts,
    reconnect,
    disconnect,
    updateActivity
  };
};
