import { Helmet } from "react-helmet-async";

const SITE_URL = "https://villedge.tech";
const DEFAULT_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/043684fd-9980-4218-8ede-f3b2d9cb3a8e/id-preview-c4a80469--4f74af6e-461b-4101-8739-798022d66ea3.lovable.app-1778213218948.png";

interface SEOProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article" | "profile";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export const SEO = ({ title, description, path, image = DEFAULT_IMAGE, type = "website", jsonLd }: SEOProps) => {
  const url = `${SITE_URL}${path}`;
  const trimmedDesc = description.length > 160 ? description.slice(0, 157) + "…" : description;
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={trimmedDesc} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={trimmedDesc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={trimmedDesc} />
      <meta name="twitter:image" content={image} />
      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
};
