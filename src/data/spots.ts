import hackerHouseImg from "@/assets/hacker-house.jpg";
import beachCafeImg from "@/assets/beach-cafe.jpg";
import kitesurfingImg from "@/assets/kitesurfing.jpg";

export type SpotCategory =
  | "accommodation"
  | "eat"
  | "coffee"
  | "bar"
  | "activity"
  | "work";

export interface Spot {
  id: string;
  name: string;
  description: string;
  image: string;
  category: SpotCategory;
  coordinates: [number, number]; // [lng, lat]
  tags?: string[];
}

export const spots: Spot[] = [
  {
    id: "hacker-house",
    name: "Hacker House",
    description: "Our coworking space with ocean views, high-speed internet, and a vibrant community of digital nomads and founders.",
    image: hackerHouseImg,
    category: "work",
    coordinates: [108.2872, 10.9333],
    tags: ["Coworking", "Community", "WiFi"],
  },
  {
    id: "beach-cafe",
    name: "Sunrise Beach Café",
    description: "The perfect spot for morning coffee with your feet in the sand. Fresh coconuts and Vietnamese coffee.",
    image: beachCafeImg,
    category: "coffee",
    coordinates: [108.2912, 10.9315],
    tags: ["Coffee", "Beach", "Breakfast"],
  },
  {
    id: "kite-beach",
    name: "Kite Beach",
    description: "One of the world's best kitesurfing spots. Consistent winds from November to April. Equipment rental available.",
    image: kitesurfingImg,
    category: "activity",
    coordinates: [108.2950, 10.9280],
    tags: ["Kitesurfing", "Beach", "Sports"],
  },
  {
    id: "popup-village",
    name: "Popup Village HQ",
    description: "The heart of our community. Weekly events, workshops, and the best sunsets in Mui Ne.",
    image: kitesurfingImg,
    category: "accommodation",
    coordinates: [108.2890, 10.9350],
    tags: ["Events", "Community", "Stay"],
  },
];

// Active categories shown in pickers and the legend
export const ACTIVE_CATEGORIES: SpotCategory[] = [
  "accommodation",
  "eat",
  "coffee",
  "bar",
  "activity",
  "work",
];

const COLOR_MAP: Record<string, string> = {
  accommodation: "#C4C790",
  eat: "#8E9456",
  coffee: "#A47551",
  bar: "#7C5E8C",
  activity: "#6E956E",
  work: "#5F7A8C",
  // legacy fallbacks for existing DB rows
  food: "#8E9456",
  atm: "#7B8A6E",
  shopping: "#9E8B7D",
};

const LABEL_MAP: Record<string, string> = {
  accommodation: "Stay",
  eat: "Eat",
  coffee: "Coffee Shops",
  bar: "Bars",
  activity: "Activities",
  work: "Work",
  // legacy fallbacks
  food: "Eat",
  atm: "Other",
  shopping: "Other",
};

export const categoryColors = new Proxy(COLOR_MAP, {
  get: (t, k: string) => t[k] ?? "#8E9456",
}) as Record<string, string>;

export const categoryLabels = new Proxy(LABEL_MAP, {
  get: (t, k: string) => t[k] ?? (k.charAt(0).toUpperCase() + k.slice(1)),
}) as Record<string, string>;
