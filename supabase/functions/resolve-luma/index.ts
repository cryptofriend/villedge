const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EventData {
  name?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  imageUrl?: string;
  hostName?: string;
  hostAvatar?: string;
  lumaUrl?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resolving Luma URL:', url);

    // Normalize the URL to handle both lu.ma and luma.com
    let normalizedUrl = url.trim();
    if (normalizedUrl.includes('lu.ma/')) {
      normalizedUrl = normalizedUrl.replace('lu.ma/', 'luma.com/');
    }

    const eventData: EventData = {
      lumaUrl: url,
    };

    // Fetch the Luma page
    try {
      const pageResponse = await fetch(normalizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });
      
      const html = await pageResponse.text();
      
      // Extract title (event name) from og:title or page title
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      if (ogTitleMatch) {
        eventData.name = ogTitleMatch[1];
      } else {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          eventData.name = titleMatch[1].replace(/\s*\|\s*Luma$/i, '').trim();
        }
      }
      
      // Extract description from og:description or meta description
      const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      if (ogDescMatch) {
        eventData.description = ogDescMatch[1];
      } else {
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        if (descMatch) {
          eventData.description = descMatch[1];
        }
      }
      
      // Extract og:image (event cover image)
      const ogImgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
      if (ogImgMatch && ogImgMatch[1]) {
        eventData.imageUrl = ogImgMatch[1];
      }
      
      // Try to find date/time in the page content
      // Luma typically shows dates in various formats, look for common patterns
      
      // Look for structured date info in JSON-LD
      const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      if (jsonLdMatch) {
        for (const match of jsonLdMatch) {
          try {
            const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
            const parsed = JSON.parse(jsonContent);
            
            if (parsed.startDate) {
              eventData.startTime = parsed.startDate;
            }
            if (parsed.endDate) {
              eventData.endTime = parsed.endDate;
            }
            if (parsed.location?.name) {
              eventData.location = parsed.location.name;
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
      
      // Try to find date from meta tags or content
      if (!eventData.startTime) {
        // Look for common date patterns in the HTML
        const datePatterns = [
          /(\w+),\s+(\w+)\s+(\d{1,2})\s*(?:,\s*(\d{4}))?[^\d]*(\d{1,2}):(\d{2})\s*(AM|PM)/i,
          /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/,
        ];
        
        for (const pattern of datePatterns) {
          const match = html.match(pattern);
          if (match) {
            // Use the raw match for now, frontend can parse it
            console.log('Found date pattern:', match[0]);
            break;
          }
        }
      }
      
      // Extract host info - look for "Hosted By" section
      const hostedByMatch = html.match(/Hosted By[\s\S]*?<a[^>]*href=["'][^"']*\/user\/[^"']*["'][^>]*>([^<]+)<\/a>/i);
      if (hostedByMatch) {
        eventData.hostName = hostedByMatch[1].trim();
      }
      
      // Look for host avatar
      const hostAvatarMatch = html.match(/Hosted By[\s\S]*?<img[^>]*src=["']([^"']*lumacdn\.com[^"']*\/user[^"']*)["']/i);
      if (hostAvatarMatch) {
        eventData.hostAvatar = hostAvatarMatch[1];
      }
      
      // Try to get location from the page
      if (!eventData.location) {
        // Look for Google Maps link which often contains location
        const mapsLinkMatch = html.match(/google\.com\/maps\/search\/\?[^"']*query=([^"'&]+)/i);
        if (mapsLinkMatch) {
          eventData.location = decodeURIComponent(mapsLinkMatch[1].replace(/\+/g, ' '));
        }
      }
      
    } catch (e) {
      console.log('Could not fetch Luma page details:', e);
    }

    if (!eventData.name) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not extract event data from URL',
          data: eventData 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracted event data:', eventData);

    return new Response(
      JSON.stringify({ success: true, data: eventData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error resolving Luma URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to resolve URL';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
