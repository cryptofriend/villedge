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
    // Formats: https://lu.ma/event-slug or https://lu.ma/event/evt-xxxx
    let eventSlug: string;
    const urlMatch = luma_url.match(/lu\.ma\/(?:event\/)?([a-zA-Z0-9\-]+)/);
    
    if (!urlMatch) {
      return new Response(
        JSON.stringify({ error: 'Invalid Luma URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    eventSlug = urlMatch[1];
    console.log('Extracted event slug:', eventSlug);

    // Fetch event page and extract JSON-LD data
    const pageResponse = await fetch(luma_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EventBot/1.0)',
        'Accept': 'text/html',
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
    
    // Try to extract JSON-LD structured data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    
    let eventData: LumaEventData | null = null;
    
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        console.log('Parsed JSON-LD:', JSON.stringify(jsonLd).slice(0, 500));
        
        eventData = {
          title: jsonLd.name || 'Untitled Event',
          description: jsonLd.description || null,
          start_time: jsonLd.startDate,
          end_time: jsonLd.endDate || null,
          location: jsonLd.location?.name || jsonLd.location?.address?.streetAddress || null,
          image_url: jsonLd.image || null,
          luma_id: eventSlug,
        };
      } catch (parseError) {
        console.error('Failed to parse JSON-LD:', parseError);
      }
    }

    // Fallback: extract from meta tags and HTML
    if (!eventData) {
      console.log('Falling back to meta tag extraction');
      
      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
      const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
      const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
      
      // Try to find date in the page
      const dateMatch = html.match(/datetime="([^"]+)"/);
      
      eventData = {
        title: titleMatch ? titleMatch[1] : 'Untitled Event',
        description: descMatch ? descMatch[1] : null,
        start_time: dateMatch ? dateMatch[1] : new Date().toISOString(),
        end_time: null,
        location: null,
        image_url: imageMatch ? imageMatch[1] : null,
        luma_id: eventSlug,
      };
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
