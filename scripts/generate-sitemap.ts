// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
// Fetches villages from the public Supabase REST endpoint so dynamic
// village routes are included.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://villedge.tech";

const SUPABASE_URL = "https://hgxmhzswfrhvoynhasmb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneG1oenN3ZnJodm95bmhhc21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDc4NTQsImV4cCI6MjA4NDU4Mzg1NH0.wwshHZZvoMFd2clPgmeoHaCJ_34FXp-7vSvHSwDdinQ";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

async function fetchVillageSlugs(): Promise<{ slug: string; updated_at?: string }[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/villages?select=id,updated_at`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as { id: string; updated_at?: string }[];
    return rows.map((r) => ({ slug: r.id, updated_at: r.updated_at }));
  } catch (e) {
    console.warn("sitemap: failed to fetch villages, continuing with static routes only", e);
    return [];
  }
}

function buildSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

async function main() {
  const villages = await fetchVillageSlugs();

  const VILLAGE_SUBROUTES = ["about", "map", "residents", "scenius", "events"] as const;

  const villageEntries: SitemapEntry[] = villages.flatMap((v) => {
    const lastmod = v.updated_at ? new Date(v.updated_at).toISOString().slice(0, 10) : undefined;
    const base: SitemapEntry = {
      path: `/${v.slug}`,
      lastmod,
      changefreq: "weekly",
      priority: "0.8",
    };
    const subs: SitemapEntry[] = VILLAGE_SUBROUTES.map((sub) => ({
      path: `/${v.slug}/${sub}`,
      lastmod,
      changefreq: "weekly",
      priority: "0.6",
    }));
    return [base, ...subs];
  });

  const entries: SitemapEntry[] = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/about", changefreq: "monthly", priority: "0.6" },
    { path: "/widget", changefreq: "monthly", priority: "0.5" },
    ...villageEntries,
  ];


  writeFileSync(resolve("public/sitemap.xml"), buildSitemap(entries));
  console.log(`sitemap.xml written (${entries.length} entries)`);
}

main();
