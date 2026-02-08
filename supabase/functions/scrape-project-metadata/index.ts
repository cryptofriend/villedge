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

interface DateRange {
  start_date?: string; // ISO date string
  end_date?: string;   // ISO date string
  dates_text?: string; // Original text found
}

function extractDates(html: string, text: string): DateRange {
  const result: DateRange = {};
  const currentYear = new Date().getFullYear();
  
  // Common date patterns for events/popup villages
  const datePatterns = [
    // "March 15 - April 20, 2025" or "Mar 15 - Apr 20, 2025"
    /(\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2})\s*[-–—to]+\s*(\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}),?\s*(\d{4})/gi,
    
    // "15 March - 20 April 2025" or "15 Mar - 20 Apr 2025"
    /(\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?))\s*[-–—to]+\s*(\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)),?\s*(\d{4})/gi,
    
    // "March 15-20, 2025" (same month)
    /(\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}))\s*[-–—]\s*(\d{1,2}),?\s*(\d{4})/gi,
    
    // "2025-03-15 to 2025-04-20" ISO format
    /(\d{4}-\d{2}-\d{2})\s*(?:to|[-–—])\s*(\d{4}-\d{2}-\d{2})/gi,
    
    // "March 2025" - single month (for permanent or month-long events)
    /\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})\b/gi,
  ];
  
  const months: Record<string, number> = {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'sept': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11,
  };
  
  function parseMonthDay(str: string, year: number): Date | null {
    // Try "Month Day" format
    const match1 = str.match(/(\w+)\s+(\d{1,2})/i);
    if (match1) {
      const monthName = match1[1].toLowerCase();
      const day = parseInt(match1[2], 10);
      const monthNum = months[monthName];
      if (monthNum !== undefined) {
        return new Date(year, monthNum, day);
      }
    }
    
    // Try "Day Month" format
    const match2 = str.match(/(\d{1,2})\s+(\w+)/i);
    if (match2) {
      const day = parseInt(match2[1], 10);
      const monthName = match2[2].toLowerCase();
      const monthNum = months[monthName];
      if (monthNum !== undefined) {
        return new Date(year, monthNum, day);
      }
    }
    
    return null;
  }
  
  // Search in both HTML and cleaned text
  const searchText = text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  
  for (const pattern of datePatterns) {
    const matches = [...searchText.matchAll(pattern)];
    if (matches.length > 0) {
      const match = matches[0];
      console.log('Date pattern match:', match[0]);
      
      // Pattern 1 & 2: "Month Day - Month Day, Year"
      if (match.length >= 4 && match[3] && /^\d{4}$/.test(match[3])) {
        const year = parseInt(match[3], 10);
        const startDate = parseMonthDay(match[1], year);
        const endDate = parseMonthDay(match[2], year);
        
        if (startDate && endDate) {
          result.start_date = startDate.toISOString().split('T')[0];
          result.end_date = endDate.toISOString().split('T')[0];
          result.dates_text = match[0];
          break;
        }
      }
      
      // Pattern 3: Same month "Month Day-Day, Year"
      if (match.length >= 5 && match[4] && /^\d{4}$/.test(match[4])) {
        const monthMatch = match[1].match(/(\w+)/i);
        if (monthMatch) {
          const monthName = monthMatch[1].toLowerCase();
          const monthNum = months[monthName];
          const year = parseInt(match[4], 10);
          const startDay = parseInt(match[2], 10);
          const endDay = parseInt(match[3], 10);
          
          if (monthNum !== undefined) {
            result.start_date = new Date(year, monthNum, startDay).toISOString().split('T')[0];
            result.end_date = new Date(year, monthNum, endDay).toISOString().split('T')[0];
            result.dates_text = match[0];
            break;
          }
        }
      }
      
      // Pattern 4: ISO format dates
      if (match[1] && match[2] && /^\d{4}-\d{2}-\d{2}$/.test(match[1])) {
        result.start_date = match[1];
        result.end_date = match[2];
        result.dates_text = match[0];
        break;
      }
    }
  }
  
  return result;
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
      
      // Clean text for date extraction
      const cleanText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

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
      
      // Extract dates
      const dateInfo = extractDates(html, cleanText);

      const result = {
        title,
        description,
        favicon_url,
        thumbnail_url,
        ...socialLinks,
        ...dateInfo,
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
