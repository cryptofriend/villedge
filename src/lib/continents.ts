export type Continent =
  | "Africa"
  | "Asia"
  | "Europe"
  | "North America"
  | "South America"
  | "Oceania"
  | "Antarctica"
  | "Unknown";

const MAP: Record<string, Continent> = {
  // North America
  "United States": "North America",
  USA: "North America",
  "United States of America": "North America",
  Canada: "North America",
  Mexico: "North America",
  // South America
  Colombia: "South America",
  Chile: "South America",
  Brazil: "South America",
  Argentina: "South America",
  Peru: "South America",
  Uruguay: "South America",
  Ecuador: "South America",
  Bolivia: "South America",
  Venezuela: "South America",
  // Europe
  Spain: "Europe",
  Belgium: "Europe",
  Germany: "Europe",
  Switzerland: "Europe",
  Hungary: "Europe",
  France: "Europe",
  "United Kingdom": "Europe",
  UK: "Europe",
  Netherlands: "Europe",
  Italy: "Europe",
  Portugal: "Europe",
  Poland: "Europe",
  Sweden: "Europe",
  Norway: "Europe",
  Denmark: "Europe",
  Finland: "Europe",
  Austria: "Europe",
  Ireland: "Europe",
  Czechia: "Europe",
  "Czech Republic": "Europe",
  Greece: "Europe",
  Croatia: "Europe",
  Serbia: "Europe",
  Romania: "Europe",
  // Africa
  Morocco: "Africa",
  "South Africa": "Africa",
  Egypt: "Africa",
  Nigeria: "Africa",
  Kenya: "Africa",
  Tunisia: "Africa",
  Ghana: "Africa",
  // Asia
  Japan: "Asia",
  Indonesia: "Asia",
  Thailand: "Asia",
  "South Korea": "Asia",
  Korea: "Asia",
  China: "Asia",
  India: "Asia",
  Singapore: "Asia",
  Vietnam: "Asia",
  Philippines: "Asia",
  Malaysia: "Asia",
  "Saudi Arabia": "Asia",
  "United Arab Emirates": "Asia",
  UAE: "Asia",
  Israel: "Asia",
  Turkey: "Asia",
  // Oceania
  Australia: "Oceania",
  "New Zealand": "Oceania",
};

export function getContinent(country?: string | null): Continent {
  if (!country) return "Unknown";
  return MAP[country.trim()] ?? "Unknown";
}

// Tailwind classes for bar background per continent
export const CONTINENT_BAR: Record<Continent, string> = {
  "North America": "bg-sky-500",
  "South America": "bg-amber-500",
  Europe: "bg-violet-500",
  Africa: "bg-orange-600",
  Asia: "bg-rose-500",
  Oceania: "bg-emerald-500",
  Antarctica: "bg-slate-400",
  Unknown: "bg-muted-foreground",
};

export const CONTINENT_DOT: Record<Continent, string> = CONTINENT_BAR;

export const CONTINENT_ORDER: Continent[] = [
  "North America",
  "South America",
  "Europe",
  "Africa",
  "Asia",
  "Oceania",
  "Antarctica",
  "Unknown",
];
