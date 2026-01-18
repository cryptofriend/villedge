import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LumaApiEvent {
  api_id: string;
  name: string;
  description?: string;
  cover_url?: string;
  url?: string;
  timezone?: string;
  start_at?: string;
  end_at?: string;
  geo_latitude?: number;
  geo_longitude?: number;
  geo_address_info?: {
    full_address?: string;
    city?: string;
    country?: string;
    place_id?: string;
  };
}

interface LumaApiHost {
  name?: string;
  avatar_url?: string;
}

interface LumaApiEntry {
  event: LumaApiEvent;
  hosts?: LumaApiHost[];
}

interface EventData {
  name: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  image_url?: string;
  host_name?: string;
  host_avatar?: string;
  luma_url: string;
  coordinates?: { lng: number; lat: number } | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { calendarUrl, apiKey } = await req.json();
    
    if (!calendarUrl && !apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Calendar URL or API key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract calendar ID from URL if provided
    let calendarId = '';
    if (calendarUrl) {
      // Support formats like:
      // https://luma.com/calendar/manage/cal-xxx
      // https://lu.ma/calendar/cal-xxx
      // cal-xxx (direct ID)
      const calIdMatch = calendarUrl.match(/cal-[a-zA-Z0-9]+/);
      if (calIdMatch) {
        calendarId = calIdMatch[0];
      }
    }

    // Get Luma API key from secrets or request
    const lumaApiKey = apiKey || Deno.env.get('LUMA_API_KEY');
    
    if (!lumaApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Luma API key is required. Add it in Settings → Secrets as LUMA_API_KEY, or pass it in the request.',
          requiresApiKey: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Importing from Luma calendar:', calendarId || 'using API key');

    // Fetch events from Luma API
    const allEvents: LumaApiEntry[] = [];
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore) {
      const url = new URL('https://api.lu.ma/public/v2/calendar/list-events');
      if (cursor) {
        url.searchParams.set('pagination_cursor', cursor);
      }
      url.searchParams.set('pagination_limit', '50');
      
      console.log('Fetching from Luma API:', url.toString());
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-luma-api-key': lumaApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Luma API error:', response.status, errorText);
        
        if (response.status === 401) {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid Luma API key' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ success: false, error: `Luma API error: ${response.status}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      console.log('Luma API response:', JSON.stringify(data).substring(0, 500));
      
      const entries = data.entries || [];
      allEvents.push(...entries);
      
      // Check for pagination
      cursor = data.next_cursor || null;
      hasMore = data.has_more === true && cursor !== null;
      
      console.log(`Fetched ${entries.length} events, total: ${allEvents.length}, has_more: ${hasMore}`);
      
      // Small delay between pages
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`Total events from API: ${allEvents.length}`);

    if (allEvents.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          imported: 0,
          message: 'No events found in calendar'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process events
    const events: EventData[] = [];
    const errors: string[] = [];

    for (const entry of allEvents) {
      const event = entry.event;
      const host = entry.hosts?.[0];
      
      // Build event URL
      const eventUrl = event.url || `https://lu.ma/${event.api_id}`;
      
      // Build coordinates if available
      let coordinates: { lng: number; lat: number } | null = null;
      if (event.geo_latitude && event.geo_longitude) {
        coordinates = {
          lat: event.geo_latitude,
          lng: event.geo_longitude,
        };
      }
      
      // Build location string
      let location = event.geo_address_info?.full_address || 
                     event.geo_address_info?.city || 
                     null;
      
      const eventData: EventData = {
        name: event.name,
        description: event.description || undefined,
        start_time: event.start_at,
        end_time: event.end_at || undefined,
        location: location || undefined,
        image_url: event.cover_url || undefined,
        host_name: host?.name || undefined,
        host_avatar: host?.avatar_url || undefined,
        luma_url: eventUrl,
        coordinates,
      };
      
      events.push(eventData);
      
      // Insert into database
      if (eventData.name && eventData.start_time) {
        try {
          const { error: insertError } = await supabase
            .from('events')
            .upsert({
              name: eventData.name,
              start_time: eventData.start_time,
              end_time: eventData.end_time,
              location: eventData.location,
              description: eventData.description,
              image_url: eventData.image_url,
              host_name: eventData.host_name,
              host_avatar: eventData.host_avatar,
              luma_url: eventData.luma_url,
              coordinates: eventData.coordinates,
            }, {
              onConflict: 'luma_url',
              ignoreDuplicates: false,
            });
          
          if (insertError) {
            console.error('Insert error for', eventData.name, ':', insertError);
            errors.push(`${eventData.name}: ${insertError.message}`);
          } else {
            console.log('Upserted event:', eventData.name);
          }
        } catch (e) {
          console.error('Error upserting event:', eventData.name, e);
          errors.push(`${eventData.name}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    }

    const importedCount = events.filter(e => e.start_time).length - errors.length;
    console.log(`Successfully processed ${importedCount} events`);

    return new Response(
      JSON.stringify({
        success: true,
        imported: importedCount,
        total_found: events.length,
        events: events.map(e => ({ 
          name: e.name, 
          start_time: e.start_time, 
          luma_url: e.luma_url,
          has_coordinates: !!e.coordinates 
        })),
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error importing calendar:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to import calendar';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
