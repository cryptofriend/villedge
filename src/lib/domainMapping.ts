/**
 * Maps custom domains to village slugs.
 * When a user visits a custom domain, they are routed directly to the corresponding village.
 */
const DOMAIN_TO_VILLAGE: Record<string, string> = {
  "proofofretreat.me": "proof-of-retreat",
  "www.proofofretreat.me": "proof-of-retreat",
};

/**
 * Returns the village slug if the current hostname matches a custom domain mapping.
 * Returns null if this is the main platform domain.
 */
export function getVillageSlugFromDomain(hostname: string): string | null {
  return DOMAIN_TO_VILLAGE[hostname] || null;
}

/**
 * Check if the current hostname is a custom village domain (not the main platform).
 */
export function isCustomVillageDomain(hostname: string): boolean {
  return hostname in DOMAIN_TO_VILLAGE;
}
