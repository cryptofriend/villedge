import hackerHouseImg from "@/assets/hacker-house.jpg";
import beachCafeImg from "@/assets/beach-cafe.jpg";
import kitesurfingImg from "@/assets/kitesurfing.jpg";

export interface Spot {
  id: string;
  name: string;
  description: string;
  image: string;
  category: "accommodation" | "food" | "activity" | "work";
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
    category: "food",
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

export const categoryColors: Record<Spot["category"], string> = {
  accommodation: "#C4C790",
  food: "#8E9456",
  activity: "#6E956E",
  work: "#8E9456",
};

export const categoryLabels: Record<Spot["category"], string> = {
  accommodation: "Stay",
  food: "Eat & Drink",
  activity: "Activities",
  work: "Work",
};
