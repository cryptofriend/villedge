const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { village_id } = await req.json();
    if (!village_id) {
      return new Response(JSON.stringify({ error: 'village_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch village data
    const villageRes = await fetch(`${SUPABASE_URL}/rest/v1/villages?id=eq.${village_id}&select=*`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    const villages = await villageRes.json();
    if (!villages?.length) {
      return new Response(JSON.stringify({ error: 'Village not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const village = villages[0];

    // Scrape website content if available
    let scrapedContent = '';
    if (village.website_url && FIRECRAWL_API_KEY) {
      try {
        console.log('Scraping website:', village.website_url);
        const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: village.website_url,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });
        const scrapeData = await scrapeRes.json();
        scrapedContent = scrapeData?.data?.markdown || scrapeData?.markdown || '';
        console.log('Scraped content length:', scrapedContent.length);
      } catch (e) {
        console.error('Scrape failed, continuing without:', e);
      }
    }

    // Build AI prompt
    const prompt = `You are writing an SEO-optimized "About" page for a popup village / community gathering. Write unique, engaging content that will rank well on search engines.

Village metadata:
- Name: ${village.name}
- Location: ${village.location}
- Dates: ${village.dates}
- Type: ${village.village_type}
${village.focus ? `- Focus: ${village.focus}` : ''}
${village.participants ? `- Participants: ${village.participants}` : ''}
${village.description ? `- Short description: ${village.description}` : ''}

${scrapedContent ? `Website content (use as source material, rewrite completely):\n${scrapedContent.slice(0, 8000)}` : 'No website content available. Generate based on the metadata above.'}

Requirements:
1. Write in markdown format
2. Start with a compelling intro paragraph (no H1 — the page already has the village name as H1)
3. Include sections with H2 headings like: "What is ${village.name}?", "What to Expect", "Location & Setting", "Who Should Join"
4. Naturally incorporate keywords: popup village, ${village.location}, coliving, community gathering, ${village.focus || 'digital nomads'}
5. Keep it 300-500 words — concise but informative
6. Do NOT invent specific facts not present in the source material
7. Write in third person, professional but warm tone
8. Do NOT include any links or URLs`;

    console.log('Generating about content with AI...');
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert SEO content writer specializing in community events, coliving spaces, and popup villages.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('AI error:', aiRes.status, errText);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiRes.json();
    const aboutContent = aiData.choices?.[0]?.message?.content;

    if (!aboutContent) {
      return new Response(JSON.stringify({ error: 'No content generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save to database
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/villages?id=eq.${village_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ about_content: aboutContent }),
    });

    if (!updateRes.ok) {
      console.error('DB update failed:', await updateRes.text());
      return new Response(JSON.stringify({ error: 'Failed to save content' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('About content generated and saved for village:', village_id);

    return new Response(
      JSON.stringify({ success: true, about_content: aboutContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
