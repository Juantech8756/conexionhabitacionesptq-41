
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
}

interface RequestBody {
  targetType: 'guest' | 'reception';
  targetId?: string;
  notification: NotificationPayload;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse the request body
    const { targetType, targetId, notification } = await req.json() as RequestBody;

    // Validate input
    if (!targetType || !notification || !notification.title || !notification.body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get subscriptions based on target type
    let subscriptions;
    if (targetType === 'guest' && targetId) {
      const { data, error } = await supabaseClient
        .from('notification_subscriptions')
        .select('*')
        .eq('guestId', targetId);
      
      if (error) throw error;
      subscriptions = data;
    } else if (targetType === 'reception') {
      const { data, error } = await supabaseClient
        .from('notification_subscriptions')
        .select('*')
        .not('userId', 'is', null);
      
      if (error) throw error;
      subscriptions = data;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid target type or missing targetId" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // If no subscriptions found, return early
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Send notification to each subscription
    const notificationPromises = subscriptions.map(async (sub) => {
      try {
        // In a real application, you would use web-push library
        // For now, we'll just log the notification
        console.log(`Sending notification to ${sub.endpoint}:`, notification);
        
        // Simulate sending a push notification
        // In production, you would use web-push library
        return {
          success: true,
          subscription: sub.endpoint,
        };
      } catch (error) {
        console.error(`Error sending notification to ${sub.endpoint}:`, error);
        return {
          success: false,
          subscription: sub.endpoint,
          error: error.message,
        };
      }
    });

    const results = await Promise.all(notificationPromises);

    return new Response(
      JSON.stringify({ 
        message: "Notifications sent", 
        results,
        subscriptionCount: subscriptions.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error processing notification request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
