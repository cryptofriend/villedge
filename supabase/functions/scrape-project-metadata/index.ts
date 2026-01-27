const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      // Return basic metadata without scraping
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            title: extractDomain(url),
            description: null,
            favicon_url: `https://www.google.com/s2/favicons?domain=${extractDomain(url)}&sz=64`,
            thumbnail_url: null,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL:', formattedUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      // Fallback to basic metadata
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            title: extractDomain(formattedUrl),
            description: null,
            favicon_url: `https://www.google.com/s2/favicons?domain=${extractDomain(formattedUrl)}&sz=64`,
            thumbnail_url: null,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract metadata from response
    const metadata = data.data?.metadata || data.metadata || {};
    const domain = extractDomain(formattedUrl);
    
    const result = {
      title: metadata.title || metadata.ogTitle || domain,
      description: metadata.description || metadata.ogDescription || null,
      favicon_url: metadata.favicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      thumbnail_url: metadata.ogImage || metadata.image || null,
    };

    console.log('Scraped metadata:', result);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}
