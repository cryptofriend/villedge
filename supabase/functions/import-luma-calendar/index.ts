import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
}

async function extractEventFromPage(eventUrl: string): Promise<EventData | null> {
  try {
    console.log('Fetching event:', eventUrl);
    
    const response = await fetch(eventUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    if (!response.ok) {
      console.log('Failed to fetch event page:', response.status);
      return null;
    }
    
    const html = await response.text();
    
    const eventData: EventData = {
      name: '',
      luma_url: eventUrl,
    };
    
    // Extract title from og:title
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (ogTitleMatch) {
      eventData.name = ogTitleMatch[1];
    } else {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        eventData.name = titleMatch[1].replace(/\s*\|\s*Luma$/i, '').trim();
      }
    }
    
    if (!eventData.name) {
      return null;
    }
    
    // Extract description
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    if (ogDescMatch) {
      eventData.description = ogDescMatch[1];
    }
    
    // Extract image
    const ogImgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogImgMatch && ogImgMatch[1]) {
      eventData.image_url = ogImgMatch[1];
    }
    
    // Try to find JSON-LD structured data
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
          const parsed = JSON.parse(jsonContent);
          
          if (parsed.startDate) {
            eventData.start_time = parsed.startDate;
          }
          if (parsed.endDate) {
            eventData.end_time = parsed.endDate;
          }
          if (parsed.location?.name) {
            eventData.location = parsed.location.name;
          } else if (parsed.location?.address?.streetAddress) {
            eventData.location = parsed.location.address.streetAddress;
          }
          if (parsed.name && !eventData.name) {
            eventData.name = parsed.name;
          }
          if (parsed.description && !eventData.description) {
            eventData.description = parsed.description;
          }
        } catch (e) {
          // JSON parse failed, continue
        }
      }
    }
    
    // Extract host info
    const hostedByMatch = html.match(/Hosted By[\s\S]*?<a[^>]*href=["'][^"']*\/user\/[^"']*["'][^>]*>([^<]+)<\/a>/i);
    if (hostedByMatch) {
      eventData.host_name = hostedByMatch[1].trim();
    }
    
    // Try to get location from Google Maps link
    if (!eventData.location) {
      const mapsLinkMatch = html.match(/google\.com\/maps\/search\/\?[^"']*query=([^"'&]+)/i);
      if (mapsLinkMatch) {
        eventData.location = decodeURIComponent(mapsLinkMatch[1].replace(/\+/g, ' '));
      }
    }
    
    console.log('Extracted event:', eventData.name);
    return eventData;
  } catch (error) {
    console.error('Error extracting event:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { calendarUrl } = await req.json();
    
    if (!calendarUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Calendar URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Importing from calendar:', calendarUrl);

    // Normalize URL
    let normalizedUrl = calendarUrl.trim();
    if (normalizedUrl.includes('lu.ma/')) {
      normalizedUrl = normalizedUrl.replace('lu.ma/', 'luma.com/');
    }

    // Fetch the calendar page
    const calendarResponse = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!calendarResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch calendar page' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const calendarHtml = await calendarResponse.text();
    
    // Extract event links - look for lu.ma or luma.com short URLs
    const eventLinkPattern = /href=["'](https?:\/\/(?:lu\.ma|luma\.com)\/([a-zA-Z0-9]{6,12}))["']/gi;
    const eventLinks = new Set<string>();
    let match;
    
    while ((match = eventLinkPattern.exec(calendarHtml)) !== null) {
      const url = match[1];
      // Filter out calendar links, user links, etc.
      if (!url.includes('/calendar/') && !url.includes('/user/') && !url.includes('/manage/')) {
        eventLinks.add(url);
      }
    }

    console.log(`Found ${eventLinks.size} event links`);

    if (eventLinks.size === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No events found on calendar page' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process each event
    const events: EventData[] = [];
    const errors: string[] = [];
    
    for (const eventUrl of eventLinks) {
      try {
        const eventData = await extractEventFromPage(eventUrl);
        if (eventData) {
          events.push(eventData);
          
          // Insert into database if it has required fields
          if (eventData.name && eventData.start_time) {
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
              }, {
                onConflict: 'luma_url',
                ignoreDuplicates: false,
              });
            
            if (insertError) {
              console.error('Insert error for', eventData.name, ':', insertError);
              errors.push(`${eventData.name}: ${insertError.message}`);
            }
          }
        }
      } catch (e) {
        console.error('Error processing event:', eventUrl, e);
        errors.push(`Failed to process ${eventUrl}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`Successfully processed ${events.length} events`);

    return new Response(
      JSON.stringify({
        success: true,
        imported: events.length,
        events: events.map(e => ({ name: e.name, start_time: e.start_time, luma_url: e.luma_url })),
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
