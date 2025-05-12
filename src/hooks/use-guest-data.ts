
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Guest, Room, Message } from "@/types/dashboard";
import { useRealtime } from "@/hooks/use-realtime";

export const useGuestData = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [recentlyUpdatedGuests, setRecentlyUpdatedGuests] = useState<Record<string, boolean>>({});
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(Date.now());
  const { toast } = useToast();
  
  // Load rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data, error } = await supabase.from('rooms').select('*');
        if (error) throw error;
        
        const roomsMap: Record<string, Room> = {};
        data?.forEach(room => {
          roomsMap[room.id] = room;
        });
        
        setRooms(roomsMap);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      }
    };
    
    fetchRooms();
  }, []);
  
  // Set up real-time subscriptions for all data
  const { isConnected } = useRealtime([
    // Room changes
    {
      table: 'rooms',
      event: '*',
      callback: async (payload) => {
        console.log("Room changed:", payload);
        
        // Update the single room in our rooms state
        if (payload.new) {
          setRooms(prev => ({
            ...prev,
            [payload.new.id]: payload.new as Room
          }));
        }
      }
    },
    // Guest changes
    {
      table: 'guests',
      event: '*',
      callback: () => {
        refreshGuestsList();
      }
    },
    // Message changes for all guests
    {
      table: 'messages',
      event: 'INSERT',
      callback: (payload) => {
        const newMessage = payload.new as Message;
        console.log("New message:", newMessage);
        
        // Add visual indicator for guest with new message
        setRecentlyUpdatedGuests(prev => ({
          ...prev,
          [newMessage.guest_id]: true
        }));
        
        // Clear the indicator after 3 seconds
        setTimeout(() => {
          setRecentlyUpdatedGuests(prev => ({
            ...prev,
            [newMessage.guest_id]: false
          }));
        }, 3000);
        
        // Update the messages for this guest if we're viewing them
        if (selectedGuest && selectedGuest.id === newMessage.guest_id) {
          setMessages(prev => ({
            ...prev,
            [selectedGuest.id]: [...(prev[selectedGuest.id] || []), newMessage]
          }));
          
          // Mark previous messages as responded if this is a staff reply
          if (!newMessage.is_guest) {
            updateResponseStatus(selectedGuest.id);
          } else {
            // If it's a guest message and we're viewing that guest, mark as read in UI
            setGuests(prevGuests => prevGuests.map(g => {
              if (g.id === selectedGuest.id) {
                return {
                  ...g,
                  unread_messages: g.unread_messages + 1,
                  last_activity: newMessage.created_at
                };
              }
              return g;
            }));
            
            // Force refresh response stats after a short delay
            setTimeout(() => {
              refreshGuestsList();
            }, 500);
          }
        } else {
          // If we're not viewing this guest, update their unread count
          setGuests(prevGuests => prevGuests.map(g => {
            if (g.id === newMessage.guest_id && newMessage.is_guest) {
              return {
                ...g,
                unread_messages: g.unread_messages + 1,
                last_activity: newMessage.created_at
              };
            }
            return g;
          }));
        }
        
        setLastUpdateTimestamp(Date.now());
      }
    }
  ], "reception-dashboard-realtime");
  
  // Force refresh guests list
  const refreshGuestsList = async () => {
    try {
      // Join guests and response_statistics to get wait times
      const { data: statsData, error: statsError } = await supabase
        .from('response_statistics')
        .select('guest_id, guest_name, room_number, pending_messages, wait_time_minutes');
      
      if (statsError) throw statsError;

      // Get all guests
      const { data: guestsData, error: guestsError } = await supabase
        .from('guests')
        .select('id, name, room_number, room_id, created_at, guest_count');
      
      if (guestsError) throw guestsError;
      if (!guestsData) return;

      // Create a map of response statistics by guest_id
      const statsMap: Record<string, any> = {};
      statsData?.forEach(stat => {
        statsMap[stat.guest_id] = stat;
      });

      // For each guest, get the latest message timestamp and unread count
      const enhancedGuests = await Promise.all(guestsData.map(async guest => {
        // Get latest message timestamp
        const { data: latestMessage } = await supabase
          .from('messages')
          .select('created_at')
          .eq('guest_id', guest.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get stats from the stats map
        const guestStats = statsMap[guest.id] || {};
        
        return {
          ...guest,
          last_activity: latestMessage?.created_at || guest.created_at,
          unread_messages: guestStats.pending_messages || 0,
          wait_time_minutes: guestStats.wait_time_minutes || 0,
          guest_count: guest.guest_count || null
        };
      }));

      // Sort by last activity
      enhancedGuests.sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());
      
      setGuests(enhancedGuests);
    } catch (error) {
      console.error("Error refreshing guests list:", error);
    }
  };
  
  // Update response status for messages when staff replies
  const updateResponseStatus = async (guestId: string) => {
    const now = new Date().toISOString();
    try {
      // Find all unreplied guest messages in a single call
      const { data: pendingMessages, error: fetchError } = await supabase
        .from('messages')
        .select('id, created_at')
        .eq('guest_id', guestId)
        .eq('is_guest', true)
        .is('responded_at', null);
      
      if (fetchError) throw fetchError;
      if (!pendingMessages || pendingMessages.length === 0) return;

      // Prepare updates for batch processing
      const updatePromises = pendingMessages.map(msg => {
        // Calculate response time in seconds
        const createdAt = new Date(msg.created_at);
        const responseTime = Math.round((new Date().getTime() - createdAt.getTime()) / 1000);

        // Update each message individually
        return supabase.from('messages').update({
          responded_at: now,
          response_time: responseTime
        }).eq('id', msg.id);
      });
      
      // Execute all updates in parallel
      await Promise.all(updatePromises);

      // Immediately reset wait time in local state for better UX feedback
      if (selectedGuest && selectedGuest.id === guestId) {
        setSelectedGuest(prev => prev ? {
          ...prev,
          wait_time_minutes: 0,
          unread_messages: 0
        } : null);
      }

      // Also update the guest in the guests list
      setGuests(prevGuests => prevGuests.map(g => g.id === guestId ? {
        ...g,
        wait_time_minutes: 0,
        unread_messages: 0
      } : g));

      // Force refresh guest statistics after a short delay
      setTimeout(() => {
        refreshGuestsList();
      }, 500);
    } catch (error) {
      console.error("Error updating response status:", error);
    }
  };
  
  // Load messages for selected guest
  const loadGuestMessages = async (guestId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('guest_id', guestId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;

      // Cast data to ensure it matches Message type
      const typedMessages = data.map(msg => ({
        ...msg,
        media_type: msg.media_type as 'image' | 'video' | undefined
      }));
      
      setMessages(prev => ({
        ...prev,
        [guestId]: typedMessages as Message[]
      }));

      return true;
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los mensajes",
        variant: "destructive"
      });
      return false;
    }
  };

  // Load initial guests list
  useEffect(() => {
    refreshGuestsList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return {
    guests,
    rooms,
    messages,
    selectedGuest,
    setSelectedGuest,
    recentlyUpdatedGuests,
    lastUpdateTimestamp,
    isConnected,
    refreshGuestsList,
    updateResponseStatus,
    loadGuestMessages
  };
};
