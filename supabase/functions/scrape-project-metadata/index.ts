const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function extractSocialLinks(html: string, baseUrl: string): { twitter_url?: string; instagram_url?: string; telegram_url?: string } {
  const socials: { twitter_url?: string; instagram_url?: string; telegram_url?: string } = {};
  
  // Twitter/X patterns
  const twitterPatterns = [
    /href=["'](https?:\/\/(?:www\.)?(twitter|x)\.com\/[^"'\s]+)["']/gi,
    /href=["']([^"']*twitter\.com[^"']*)["']/gi,
    /href=["']([^"']*x\.com\/[^"']*)["']/gi,
  ];
  for (const pattern of twitterPatterns) {
    const match = html.match(pattern);
    if (match && match[0]) {
      const urlMatch = match[0].match(/href=["']([^"']+)["']/i);
      if (urlMatch && urlMatch[1] && !urlMatch[1].includes('/share') && !urlMatch[1].includes('/intent')) {
        socials.twitter_url = urlMatch[1];
        break;
      }
    }
  }
  
  // Instagram patterns
  const instagramPatterns = [
    /href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'\s]+)["']/gi,
  ];
  for (const pattern of instagramPatterns) {
    const match = html.match(pattern);
    if (match && match[0]) {
      const urlMatch = match[0].match(/href=["']([^"']+)["']/i);
      if (urlMatch && urlMatch[1] && !urlMatch[1].includes('/share')) {
        socials.instagram_url = urlMatch[1];
        break;
      }
    }
  }
  
  // Telegram patterns
  const telegramPatterns = [
    /href=["'](https?:\/\/(?:www\.)?(t\.me|telegram\.me|telegram\.org)\/[^"'\s]+)["']/gi,
  ];
  for (const pattern of telegramPatterns) {
    const match = html.match(pattern);
    if (match && match[0]) {
      const urlMatch = match[0].match(/href=["']([^"']+)["']/i);
      if (urlMatch && urlMatch[1]) {
        socials.telegram_url = urlMatch[1];
        break;
      }
    }
  }
  
  return socials;
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

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL:', formattedUrl);
    const domain = extractDomain(formattedUrl);

    // Fetch the page directly
    try {
      const pageResponse = await fetch(formattedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      if (!pageResponse.ok) {
        throw new Error(`Failed to fetch page: ${pageResponse.status}`);
      }

      const html = await pageResponse.text();

      // Extract metadata
      let title = domain;
      let description: string | null = null;
      let favicon_url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      let thumbnail_url: string | null = null;

      // Title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
      if (ogTitleMatch) {
        title = ogTitleMatch[1].trim();
      }

      // Description
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
      if (descMatch) {
        description = descMatch[1];
      }
      const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
      if (ogDescMatch) {
        description = ogDescMatch[1];
      }

      // Favicon
      const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i) ||
                           html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i);
      if (faviconMatch && faviconMatch[1]) {
        let faviconHref = faviconMatch[1];
        if (faviconHref.startsWith('//')) {
          faviconHref = 'https:' + faviconHref;
        } else if (faviconHref.startsWith('/')) {
          const urlObj = new URL(formattedUrl);
          faviconHref = urlObj.origin + faviconHref;
        } else if (!faviconHref.startsWith('http')) {
          const urlObj = new URL(formattedUrl);
          faviconHref = urlObj.origin + '/' + faviconHref;
        }
        favicon_url = faviconHref;
      }

      // OG Image / Thumbnail
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
      if (ogImageMatch && ogImageMatch[1]) {
        let imageUrl = ogImageMatch[1];
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          const urlObj = new URL(formattedUrl);
          imageUrl = urlObj.origin + imageUrl;
        }
        thumbnail_url = imageUrl;
      }

      // Extract social links
      const socialLinks = extractSocialLinks(html, formattedUrl);

      const result = {
        title,
        description,
        favicon_url,
        thumbnail_url,
        ...socialLinks,
      };

      console.log('Scraped metadata:', result);

      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (fetchError) {
      console.error('Error fetching page:', fetchError);
      // Return basic metadata if fetch fails
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            title: domain,
            description: null,
            favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
            thumbnail_url: null,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error scraping:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
