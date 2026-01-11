const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaceData {
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  coordinates?: [number, number];
  description?: string;
  imageUrl?: string;
  resolvedUrl?: string;
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

    console.log('Resolving Google Maps URL:', url);

    // Follow redirects to get the final URL
    let finalUrl = url;
    
    // For shortened URLs, we need to follow the redirect
    if (url.includes('maps.app.goo.gl') || url.includes('goo.gl')) {
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          redirect: 'follow',
        });
        finalUrl = response.url;
        console.log('Resolved to:', finalUrl);
      } catch (e) {
        console.log('Could not follow redirect, trying fetch:', e);
        // Try a full fetch if HEAD fails
        const response = await fetch(url, { redirect: 'follow' });
        finalUrl = response.url;
      }
    }

    const placeData: PlaceData = {
      resolvedUrl: finalUrl,
    };

    // Extract coordinates from the final URL
    // Priority: !8m2!3d!4d (most precise place marker) > !3d!4d > @lat,lng (view center, least precise)
    
    // Format: !8m2!3d{lat}!4d{lng} - This is the actual place marker location
    const dataMatch = finalUrl.match(/!8m2!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (dataMatch) {
      const lat = parseFloat(dataMatch[1]);
      const lng = parseFloat(dataMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        placeData.coordinates = [lng, lat]; // Mapbox uses [lng, lat]
      }
    }

    // Format: !3d{lat}!4d{lng} - Also precise place location
    if (!placeData.coordinates) {
      const dMatch = finalUrl.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
      if (dMatch) {
        const lat = parseFloat(dMatch[1]);
        const lng = parseFloat(dMatch[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          placeData.coordinates = [lng, lat];
        }
      }
    }

    // Format: @lat,lng,zoom - This is the view center, use as fallback only
    if (!placeData.coordinates) {
      const atMatch = finalUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (atMatch) {
        const lat = parseFloat(atMatch[1]);
        const lng = parseFloat(atMatch[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          placeData.coordinates = [lng, lat];
        }
      }
    }

    // Format: /search/lat,+lng or /search/lat,lng - coordinates in search path
    if (!placeData.coordinates) {
      const searchMatch = finalUrl.match(/\/search\/(-?\d+\.?\d*),\+?(-?\d+\.?\d*)/);
      if (searchMatch) {
        const lat = parseFloat(searchMatch[1]);
        const lng = parseFloat(searchMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          placeData.coordinates = [lng, lat];
          console.log('Extracted coordinates from /search/ path:', lat, lng);
        }
      }
    }

    // Extract place name from /place/Name/ format
    const placeMatch = finalUrl.match(/\/place\/([^\/]+)/);
    if (placeMatch) {
      placeData.name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    }

    // Try to fetch the page to get more details
    try {
      const pageResponse = await fetch(finalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });
      const html = await pageResponse.text();
      
      // Extract meta description
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      if (descMatch) {
        placeData.description = descMatch[1];
      }
      
      // Try to extract og:image (multiple patterns)
      let imageFound = false;
      
      // Pattern 1: og:image meta tag
      const ogImgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
      if (ogImgMatch && ogImgMatch[1]) {
        placeData.imageUrl = ogImgMatch[1];
        imageFound = true;
      }
      
      // Pattern 2: twitter:image meta tag
      if (!imageFound) {
        const twitterImgMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
        if (twitterImgMatch && twitterImgMatch[1]) {
          placeData.imageUrl = twitterImgMatch[1];
          imageFound = true;
        }
      }
      
      // Pattern 3: Look for Google Photos URLs in the page
      if (!imageFound) {
        const googlePhotoMatch = html.match(/https:\/\/lh\d\.googleusercontent\.com\/[^"'\s]+/);
        if (googlePhotoMatch) {
          // Get a reasonably sized image
          let imgUrl = googlePhotoMatch[0];
          // Remove size parameters and add a standard size
          imgUrl = imgUrl.replace(/=w\d+-h\d+[^"'\s]*/g, '=w800-h600');
          if (!imgUrl.includes('=w')) {
            imgUrl += '=w800-h600';
          }
          placeData.imageUrl = imgUrl;
          imageFound = true;
        }
      }

      // Try to extract title if we don't have a name
      if (!placeData.name) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          // Clean up the title (remove "- Google Maps" suffix)
          placeData.name = titleMatch[1].replace(/\s*[-–]\s*Google Maps.*$/i, '').trim();
        }
      }

      // Look for coordinates in various script tags
      if (!placeData.coordinates) {
        // Try to find coordinates in the page content
        const coordPatterns = [
          /\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/,
          /"(-?\d+\.\d+),(-?\d+\.\d+)"/,
          /center=(-?\d+\.\d+),(-?\d+\.\d+)/,
        ];
        
        for (const pattern of coordPatterns) {
          const match = html.match(pattern);
          if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
              placeData.coordinates = [lng, lat];
              break;
            }
          }
        }
      }
    } catch (e) {
      console.log('Could not fetch page details:', e);
    }

    if (!placeData.coordinates) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not extract coordinates from URL',
          resolvedUrl: finalUrl 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracted place data:', placeData);

    return new Response(
      JSON.stringify({ success: true, data: placeData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error resolving Google Maps URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to resolve URL';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
