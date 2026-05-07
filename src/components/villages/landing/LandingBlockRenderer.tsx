import ReactMarkdown from "react-markdown";
import { MapPin, Calendar as CalIcon, Users, Globe, ExternalLink } from "lucide-react";
import type { LandingBlock, Village } from "@/hooks/useVillages";
import { ResidentsList } from "@/components/ResidentsList";
import { useResidents } from "@/hooks/useResidents";
import { useStays } from "@/hooks/useStays";
import { useSceniusProjects } from "@/hooks/useSceniusProjects";
import { StayGanttTimeline } from "@/components/stays/StayGanttTimeline";
import { SceniusList } from "@/components/SceniusList";
import { EventsList } from "@/components/events/EventsList";

interface LandingBlockRendererProps {
  block: LandingBlock;
  village: Village;
}

export const LandingBlockRenderer = ({ block, village }: LandingBlockRendererProps) => {
  if (!block.visible) return null;

  switch (block.type) {
    case "hero":
      return <HeroBlock village={village} />;
    case "markdown":
      return <MarkdownBlock content={block.props?.content || village.about_content || ""} />;
    case "residents":
      return <ResidentsBlock villageId={village.id} />;
    case "stays":
      return <StaysBlock villageId={village.id} />;
    case "scenius":
      return <SceniusBlock villageId={village.id} />;
    case "events":
      return <EventsBlock villageId={village.id} />;
    case "map":
      return <MapBlock village={village} />;
    default:
      return null;
  }
};

const SectionWrapper = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-border bg-card/60 p-5 sm:p-6 backdrop-blur-sm">
    {title && <h2 className="font-display text-lg font-semibold text-foreground mb-4">{title}</h2>}
    {children}
  </section>
);

const HeroBlock = ({ village }: { village: Village }) => (
  <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-10">
    <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">
      {village.logo_url && (
        <img
          src={village.logo_url}
          alt={village.name}
          className="h-20 w-20 sm:h-28 sm:w-28 rounded-xl object-cover shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
          {village.name}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{village.description}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> {village.location}
          </span>
          {village.dates && (
            <span className="inline-flex items-center gap-1.5">
              <CalIcon className="h-4 w-4" /> {village.dates}
            </span>
          )}
          {village.participants && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {village.participants}
            </span>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {village.website_url && (
            <a
              href={village.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
            >
              <Globe className="h-3 w-3" /> Website
            </a>
          )}
          {village.apply_url && (
            <a
              href={village.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              Apply <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  </section>
);

const MarkdownBlock = ({ content }: { content: string }) =>
  content ? (
    <SectionWrapper>
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </SectionWrapper>
  ) : null;

const ResidentsBlock = ({ villageId }: { villageId: string }) => {
  const { residents, loading } = useResidents(villageId);
  return (
    <SectionWrapper title="Residents">
      <ResidentsList residents={residents} loading={loading} />
    </SectionWrapper>
  );
};

const StaysBlock = ({ villageId }: { villageId: string }) => {
  const { stays, loading } = useStays(villageId);
  return (
    <SectionWrapper title="Stays">
      <StayGanttTimeline stays={stays} loading={loading} isHost={false} />
    </SectionWrapper>
  );
};

const SceniusBlock = ({ villageId }: { villageId: string }) => {
  const { projects, residentProjects, loading } = useSceniusProjects(villageId);
  return (
    <SectionWrapper title="Scenius & projects">
      <SceniusList
        projects={projects}
        residentProjects={residentProjects}
        loading={loading}
        villageId={villageId}
      />
    </SectionWrapper>
  );
};

const EventsBlock = ({ villageId }: { villageId: string }) => (
  <SectionWrapper title="Events">
    <div className="max-h-[600px] overflow-auto">
      <EventsList villageId={villageId} />
    </div>
  </SectionWrapper>
);

const MapBlock = ({ village }: { village: Village }) => (
  <SectionWrapper title="Map">
    <a
      href={`/${village.id}/map`}
      className="flex aspect-[16/9] items-center justify-center rounded-xl bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
    >
      <MapPin className="h-6 w-6 mr-2" />
      Open interactive map
    </a>
  </SectionWrapper>
);
