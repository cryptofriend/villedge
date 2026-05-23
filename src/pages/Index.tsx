import { GlobalMap } from "@/components/GlobalMap";
import { SEO } from "@/components/SEO";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZXVkYWZvcm0iLCJhIjoiY21lczgwdndsMDZlczJqcXo3Y2g3d2diMSJ9.MbyZaNannwrrF44tMnz3aA";

const Index = () => {
  return (
    <>
      <SEO
        title="Villedge — Discover & join popup villages worldwide"
        description="Explore a live map of popup villages around the world. Join an existing community or start your own — Villedge is the coordination layer for a new Renaissance."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Villedge",
          url: "https://villedge.tech",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://villedge.tech/{search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <main className="w-screen overflow-hidden bg-background" style={{ height: 'var(--viewport-height, 100dvh)' }}>
        <GlobalMap mapboxToken={MAPBOX_TOKEN} />
      </main>
    </>
  );
};

export default Index;
