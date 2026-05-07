import type { Village } from "@/hooks/useVillages";
import { LandingBlockRenderer } from "./LandingBlockRenderer";

interface VillageLandingProps {
  village: Village;
}

export const VillageLanding = ({ village }: VillageLandingProps) => {
  const blocks = village.landing_blocks?.length
    ? village.landing_blocks
    : [
        { id: "default-hero", type: "hero" as const, visible: true },
        ...(village.about_content
          ? [{ id: "default-md", type: "markdown" as const, visible: true }]
          : []),
        { id: "default-residents", type: "residents" as const, visible: true },
        { id: "default-events", type: "events" as const, visible: true },
      ];

  return (
    <div className="mx-auto w-full max-w-4xl px-3 sm:px-6 py-6 sm:py-10 space-y-4 sm:space-y-5">
      {blocks.map((block) => (
        <LandingBlockRenderer key={block.id} block={block} village={village} />
      ))}
    </div>
  );
};
