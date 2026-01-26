import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LumaEventData {
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  image_url: string | null;
  luma_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { luma_url } = await req.json();

    if (!luma_url) {
      return new Response(
        JSON.stringify({ error: 'luma_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing Luma URL:', luma_url);

    // Extract event slug from URL
    let eventSlug: string;
    const urlMatch = luma_url.match(/(?:lu\.ma|luma\.com)\/(?:event\/)?([a-zA-Z0-9\-]+)/);
    
    if (!urlMatch) {
      return new Response(
        JSON.stringify({ error: 'Invalid Luma URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    eventSlug = urlMatch[1];
    console.log('Extracted event slug:', eventSlug);

    // Fetch event page
    const pageResponse = await fetch(luma_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!pageResponse.ok) {
      console.error('Failed to fetch Luma page:', pageResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch event page' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await pageResponse.text();
    let eventData: LumaEventData | null = null;
    
    // Method 1: Try to extract from __NEXT_DATA__ (most reliable for Luma)
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        console.log('Found __NEXT_DATA__');
        
        // Navigate to event data - structure may vary
        const pageProps = nextData?.props?.pageProps;
        const event = pageProps?.event || pageProps?.initialData?.event || pageProps?.data?.event;
        
        if (event) {
          console.log('Found event in __NEXT_DATA__:', JSON.stringify(event).slice(0, 500));
          
          eventData = {
            title: event.name || event.title || 'Untitled Event',
            description: event.description || null,
            start_time: event.start_at || event.startAt || event.start_time,
            end_time: event.end_at || event.endAt || event.end_time || null,
            location: event.geo_address_info?.full_address || 
                      event.location?.name || 
                      event.geo_address_info?.city ||
                      event.address ||
                      null,
            image_url: event.cover_url || event.coverUrl || event.cover?.url || null,
            luma_id: eventSlug,
          };
        }
      } catch (parseError) {
        console.error('Failed to parse __NEXT_DATA__:', parseError);
      }
    }

    // Method 2: Try JSON-LD structured data
    if (!eventData) {
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      
      if (jsonLdMatch) {
        try {
          const jsonLd = JSON.parse(jsonLdMatch[1]);
          console.log('Found JSON-LD:', JSON.stringify(jsonLd).slice(0, 500));
          
          if (jsonLd.startDate) {
            eventData = {
              title: jsonLd.name || 'Untitled Event',
              description: jsonLd.description || null,
              start_time: jsonLd.startDate,
              end_time: jsonLd.endDate || null,
              location: jsonLd.location?.name || jsonLd.location?.address?.streetAddress || null,
              image_url: jsonLd.image || null,
              luma_id: eventSlug,
            };
          }
        } catch (parseError) {
          console.error('Failed to parse JSON-LD:', parseError);
        }
      }
    }

    // Method 3: Fallback to meta tags
    if (!eventData) {
      console.log('Falling back to meta tag extraction');
      
      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
      const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
      const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
      
      // Try multiple date patterns
      const datePatterns = [
        /datetime="(\d{4}-\d{2}-\d{2}T[^"]+)"/,
        /"start_at":"([^"]+)"/,
        /"startAt":"([^"]+)"/,
        /"start_time":"([^"]+)"/,
      ];
      
      let startTime: string | null = null;
      for (const pattern of datePatterns) {
        const match = html.match(pattern);
        if (match) {
          startTime = match[1];
          console.log('Found date with pattern:', pattern, '->', startTime);
          break;
        }
      }

      // Try to extract end time
      const endPatterns = [
        /"end_at":"([^"]+)"/,
        /"endAt":"([^"]+)"/,
        /"end_time":"([^"]+)"/,
      ];
      
      let endTime: string | null = null;
      for (const pattern of endPatterns) {
        const match = html.match(pattern);
        if (match) {
          endTime = match[1];
          break;
        }
      }

      // Try to extract location
      const locationPatterns = [
        /"full_address":"([^"]+)"/,
        /"address":"([^"]+)"/,
        /"location_name":"([^"]+)"/,
      ];
      
      let location: string | null = null;
      for (const pattern of locationPatterns) {
        const match = html.match(pattern);
        if (match) {
          location = match[1];
          break;
        }
      }
      
      eventData = {
        title: titleMatch ? titleMatch[1].replace(' · Luma', '') : 'Untitled Event',
        description: descMatch ? descMatch[1] : null,
        start_time: startTime || new Date().toISOString(),
        end_time: endTime,
        location: location,
        image_url: imageMatch ? imageMatch[1] : null,
        luma_id: eventSlug,
      };
    }

    // Clean up title (remove " · Luma" suffix if present)
    if (eventData.title.endsWith(' · Luma')) {
      eventData.title = eventData.title.replace(' · Luma', '');
    }

    console.log('Resolved event data:', eventData);

    return new Response(
      JSON.stringify(eventData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error resolving Luma event:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
