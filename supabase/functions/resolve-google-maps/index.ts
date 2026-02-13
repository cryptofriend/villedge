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

    console.log('Resolving map URL:', url);

    const isKakaoMap = url.includes('map.kakao.com') || url.includes('map.kakao.co') || url.includes('place.map.kakao.com');

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
        const response = await fetch(url, { redirect: 'follow' });
        finalUrl = response.url;
      }
    }

    const placeData: PlaceData = {
      resolvedUrl: finalUrl,
    };

    if (isKakaoMap) {
      // === Kakao Maps URL parsing ===

      // Check for place.map.kakao.com/{placeId} format
      const placeIdMatch = url.match(/place\.map\.kakao\.com\/(\d+)/);

      // Parse coordinates from the ORIGINAL URL first (before redirect),
      // because Kakao redirects convert WGS84 to their internal TM128 projection.

      // Format: /link/map/Name,lat,lng (original URL)
      const origLinkMatch = url.match(/\/link\/map\/([^,]+),(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (origLinkMatch) {
        placeData.name = decodeURIComponent(origLinkMatch[1]);
        const lat = parseFloat(origLinkMatch[2]);
        const lng = parseFloat(origLinkMatch[3]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          placeData.coordinates = [lng, lat];
        }
      }

      // Try to follow redirects for Kakao short links
      if (url !== finalUrl) {
        console.log('Kakao resolved to:', finalUrl);
      } else {
        try {
          const response = await fetch(url, { redirect: 'follow' });
          finalUrl = response.url;
          console.log('Kakao resolved to:', finalUrl);
        } catch (e) {
          console.log('Could not follow Kakao redirect:', e);
        }
      }
      placeData.resolvedUrl = finalUrl;

      // Also try /link/map/ on the final URL if not found in original
      if (!placeData.coordinates) {
        const linkMapMatch = finalUrl.match(/\/link\/map\/([^,]+),(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (linkMapMatch) {
          if (!placeData.name) placeData.name = decodeURIComponent(linkMapMatch[1]);
          const lat = parseFloat(linkMapMatch[2]);
          const lng = parseFloat(linkMapMatch[3]);
          if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
            placeData.coordinates = [lng, lat];
          }
        }
      }

      // Try name from redirected URL query param
      if (!placeData.name) {
        const nameMatch = finalUrl.match(/[?&]name=([^&]+)/);
        if (nameMatch) {
          placeData.name = decodeURIComponent(nameMatch[1]);
        }
      }

      // Try fetching the page to extract coords and name from meta/scripts
      try {
        const fetchUrl = finalUrl;
        const pageResponse = await fetch(fetchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.5',
          },
        });
        const html = await pageResponse.text();

        // Extract title
        if (!placeData.name) {
          const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
          if (ogTitleMatch) {
            placeData.name = ogTitleMatch[1].replace(/\s*[-|]\s*카카오맵.*$/i, '').trim();
          }
        }
        if (!placeData.name) {
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) {
            placeData.name = titleMatch[1].replace(/\s*[-|]\s*카카오맵.*$/i, '').trim();
          }
        }

        // Extract description
        const descMatch = html.match(/<meta[^>]*(?:name|property)=["'](?:og:)?description["'][^>]*content=["']([^"']+)["']/i);
        if (descMatch) {
          placeData.description = descMatch[1];
        }

        // Extract image
        const ogImgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
        if (ogImgMatch) {
          placeData.imageUrl = ogImgMatch[1];
        }

        // Try to find coordinates in page content (JSON data, scripts, etc.)
        if (!placeData.coordinates) {
          const coordPatterns = [
            /longitude['":\s]+(-?\d+\.\d+)[\s\S]*?latitude['":\s]+(-?\d+\.\d+)/i,
            /lat['":\s]+(-?\d+\.\d+)[\s\S]*?lng['":\s]+(-?\d+\.\d+)/i,
            /center['":\s]*{\s*lat['":\s]+(-?\d+\.\d+),\s*lng['":\s]+(-?\d+\.\d+)/i,
            /"y"\s*:\s*"?(-?\d+\.\d+)"?\s*,\s*"x"\s*:\s*"?(-?\d+\.\d+)"?/i,
            /"lat"\s*:\s*"?(-?\d+\.\d+)"?\s*,\s*"lng"\s*:\s*"?(-?\d+\.\d+)"?/i,
          ];
          for (const pattern of coordPatterns) {
            const match = html.match(pattern);
            if (match) {
              // First pattern has lng first, others have lat first
              const isLngFirst = pattern.source.startsWith('longitude');
              const lat = parseFloat(isLngFirst ? match[2] : match[1]);
              const lng = parseFloat(isLngFirst ? match[1] : match[2]);
              if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                placeData.coordinates = [lng, lat];
                console.log('Found coords in page HTML:', lat, lng);
                break;
              }
            }
          }
        }

        // For place.map.kakao.com pages, try multiple strategies to get coordinates
        if (!placeData.coordinates && placeIdMatch) {
          const placeId = placeIdMatch[1];
          console.log('Trying Kakao place page scrape for ID:', placeId);
          try {
            // Fetch the place page itself - it may have useful meta tags
            const placePageResponse = await fetch(`https://place.map.kakao.com/${placeId}`, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html',
                'Accept-Language': 'ko-KR,ko;q=0.9',
              },
            });
            const placeHtml = await placePageResponse.text();
            
            // Log a portion for debugging
            const metaSection = placeHtml.match(/<head[\s\S]*?<\/head>/i)?.[0] || '';
            console.log('Place page meta (first 1500):', metaSection.substring(0, 1500));

            // Try og:url which may contain /link/map/Name,lat,lng
            const ogUrlMatch = placeHtml.match(/<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i);
            if (ogUrlMatch) {
              const ogUrl = ogUrlMatch[1];
              console.log('og:url found:', ogUrl);
              const ogLinkMatch = ogUrl.match(/\/link\/map\/([^,]+),(-?\d+\.?\d*),(-?\d+\.?\d*)/);
              if (ogLinkMatch) {
                if (!placeData.name) placeData.name = decodeURIComponent(ogLinkMatch[1]);
                const lat = parseFloat(ogLinkMatch[2]);
                const lng = parseFloat(ogLinkMatch[3]);
                if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                  placeData.coordinates = [lng, lat];
                  console.log('Got coords from og:url:', lat, lng);
                }
              }
            }

            // Try to extract name from og:title if not yet found
            if (!placeData.name) {
              const ogTitle = placeHtml.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
              if (ogTitle) {
                placeData.name = ogTitle[1].replace(/\s*[-|]\s*카카오맵.*$/i, '').trim();
              }
            }

            // Try og:image
            if (!placeData.imageUrl) {
              const ogImg = placeHtml.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
              if (ogImg) placeData.imageUrl = ogImg[1];
            }
            
            // Try og:description
            if (!placeData.description) {
              const ogDesc = placeHtml.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
              if (ogDesc) placeData.description = ogDesc[1];
            }

            // Try staticmap URL in twitter:image which contains &m=lng,lat
            if (!placeData.coordinates) {
              const staticMapMatch = placeHtml.match(/staticmap\.kakao\.com[^"']*[?&]m=(-?\d+\.?\d*)[,%]2[Cc](-?\d+\.?\d*)/);
              if (staticMapMatch) {
                const lng = parseFloat(staticMapMatch[1]);
                const lat = parseFloat(staticMapMatch[2]);
                if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                  placeData.coordinates = [lng, lat];
                  console.log('Got coords from staticmap URL:', lat, lng);
                }
              }
            }

            // Search for any lat/lng patterns in scripts as fallback
            if (!placeData.coordinates) {
              const scriptCoordPatterns = [
                /"lat(?:itude)?"\s*:\s*"?(-?\d+\.\d+)"?\s*,\s*"l(?:ng|on(?:gitude)?)"\s*:\s*"?(-?\d+\.\d+)"?/,
                /"y"\s*:\s*"(-?\d+\.\d+)"\s*,\s*"x"\s*:\s*"(-?\d+\.\d+)"/,
              ];
              for (const pattern of scriptCoordPatterns) {
                const m = placeHtml.match(pattern);
                if (m) {
                  const lat = parseFloat(m[1]);
                  const lng = parseFloat(m[2]);
                  if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                    placeData.coordinates = [lng, lat];
                    console.log('Got coords from page script pattern:', lat, lng);
                    break;
                  }
                }
              }
            }
          } catch (e) {
            console.log('Could not fetch Kakao place page:', e);
          }
        }
      } catch (e) {
        console.log('Could not fetch Kakao page details:', e);
      }
    } else {
      // === Google Maps URL parsing ===
      // Extract coordinates from the final URL
      const dataMatch = finalUrl.match(/!8m2!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
      if (dataMatch) {
        const lat = parseFloat(dataMatch[1]);
        const lng = parseFloat(dataMatch[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          placeData.coordinates = [lng, lat];
        }
      }

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

    const placeMatch = finalUrl.match(/\/place\/([^\/]+)/);
    if (placeMatch) {
      placeData.name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    }

    try {
      const pageResponse = await fetch(finalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });
      const html = await pageResponse.text();
      
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      if (descMatch) {
        placeData.description = descMatch[1];
      }
      
      let imageFound = false;
      const ogImgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
      if (ogImgMatch && ogImgMatch[1]) {
        placeData.imageUrl = ogImgMatch[1];
        imageFound = true;
      }
      
      if (!imageFound) {
        const twitterImgMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
        if (twitterImgMatch && twitterImgMatch[1]) {
          placeData.imageUrl = twitterImgMatch[1];
          imageFound = true;
        }
      }
      
      if (!imageFound) {
        const googlePhotoMatch = html.match(/https:\/\/lh\d\.googleusercontent\.com\/[^"'\s]+/);
        if (googlePhotoMatch) {
          let imgUrl = googlePhotoMatch[0];
          imgUrl = imgUrl.replace(/=w\d+-h\d+[^"'\s]*/g, '=w800-h600');
          if (!imgUrl.includes('=w')) {
            imgUrl += '=w800-h600';
          }
          placeData.imageUrl = imgUrl;
          imageFound = true;
        }
      }

      if (!placeData.name) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          placeData.name = titleMatch[1].replace(/\s*[-–]\s*Google Maps.*$/i, '').trim();
        }
      }

      if (!placeData.coordinates) {
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
    } // end Google Maps block

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
