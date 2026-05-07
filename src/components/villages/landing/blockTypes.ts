import type { LandingBlockType } from "@/hooks/useVillages";
import { Sparkles, Users, CalendarDays, FolderKanban, Calendar, MapPin, FileText } from "lucide-react";

export const BLOCK_LIBRARY: Array<{
  type: LandingBlockType;
  label: string;
  description: string;
  icon: typeof Sparkles;
}> = [
  { type: "hero", label: "Hero", description: "Village name, dates, location, logo", icon: Sparkles },
  { type: "markdown", label: "Rich text", description: "Custom markdown content", icon: FileText },
  { type: "residents", label: "Residents", description: "Resident grid", icon: Users },
  { type: "stays", label: "Stays timeline", description: "Gantt of upcoming stays", icon: CalendarDays },
  { type: "scenius", label: "Scenius & projects", description: "Project gallery", icon: FolderKanban },
  { type: "events", label: "Events", description: "Upcoming events list", icon: Calendar },
  { type: "map", label: "Map preview", description: "Embedded village map", icon: MapPin },
];

export const newBlockId = () =>
  `b_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
