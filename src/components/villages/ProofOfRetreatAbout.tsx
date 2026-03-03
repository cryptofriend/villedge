import { useState } from "react";
import { Village } from "@/hooks/useVillages";
import { ChevronDown, ChevronUp } from "lucide-react";
import porHeroBg from "@/assets/por-hero-bg.jpg";
import porLogo from "@/assets/proof-of-retreat-logo.png";
import porMuiNeAerial from "@/assets/por-mui-ne-aerial.jpg";
import porPhoneFree from "@/assets/por-phone-free.jpg";
import porSimpleFood from "@/assets/por-simple-food.jpg";
import porKitesurfActivity from "@/assets/por-kitesurf-activity.jpg";
import porDeepWork from "@/assets/por-deep-work.jpg";
import porRealTalk from "@/assets/por-real-talk.jpg";
import porSunMobility from "@/assets/por-sun-mobility.jpg";

interface ProofOfRetreatAboutProps {
  village: Village;
}

const POR_YELLOW = "#E8D44D";

const routineItems = [
  { time: "08:00-09:00", label: "Sun + Mobility" },
  { time: "09:00-12:00", label: "Light Breakfast, Slow Morning" },
  { time: "12:00-16:00", label: "Deep Work Block (No Phones)" },
  { time: "16:00-19:00", label: "Kitesurfing, Chill, Sunset" },
  { time: "19:00-21:00", label: "Dinner & Social" },
  { time: "21:00+", label: "Discussions, Parties, EU/US calls" },
];

const values = [
  "You want less stress and more signal",
  "You're curious, coachable, and fine saying 'I don't know—yet'",
  "You leave spaces better than you found them",
  "You prefer real talk, simple food, ocean air",
  "You're low‑drama, soft with people, sharp with work",
  "Handle your own logistics and help a neighbor when it counts",
];

const faqItems = [
  {
    q: "How can I join?",
    a: "Apply through our community Telegram group or reach out via DM on X. We'll share details on availability, pricing, and next steps.",
  },
  {
    q: "How do I get to Proof of Retreat?",
    a: "Fly into Ho Chi Minh City (SGN), then take a 2–3 hour bus or private car to Mũi Né. We can help coordinate group transfers.",
  },
  {
    q: "What are the activities we can do?",
    a: "Kitesurfing, beach runs, chess, deep-work sprints, group dinners, sunset sessions, and spontaneous techno nights.",
  },
  {
    q: "What's the cost to join?",
    a: "Costs vary by duration and accommodation type. Reach out for current rates — we keep it accessible.",
  },
  {
    q: "Is PoR women or family friendly?",
    a: "Absolutely. We welcome everyone who resonates with the vibe — calm, curious, and kind.",
  },
];

export const ProofOfRetreatAbout = ({ village }: ProofOfRetreatAboutProps) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: village.name,
    description: village.description,
    location: {
      "@type": "Place",
      name: village.location,
      geo: { "@type": "GeoCoordinates", latitude: village.center[1], longitude: village.center[0] },
    },
    ...(village.logo_url && { image: village.logo_url }),
    ...(village.website_url && { url: village.website_url }),
  };

  return (
    <article className="w-full overflow-y-auto" style={{ color: POR_YELLOW, fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ═══ HERO ═══ */}
      <section className="relative w-full min-h-[85vh] flex flex-col items-center justify-center overflow-hidden">
        <img
          src={porHeroBg}
          alt="Kitesurfing in Mũi Né"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 flex flex-col items-center text-center px-6 gap-4">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold leading-tight" style={{ color: POR_YELLOW }}>
            Reset your body.<br />Let your brain thrive.
          </h1>
          <img src={porLogo} alt="Proof of Retreat logo" className="h-20 sm:h-28 my-2" />
          <p className="max-w-lg text-sm sm:text-base opacity-90" style={{ color: POR_YELLOW }}>
            Ocean wind, sunlight, movement, simple food, and a thoughtful cadence do the heavy lifting. You just arrive.
          </p>
          {village.telegram_url && (
            <a
              href={village.telegram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 px-6 py-2.5 rounded-full border text-sm font-medium transition-colors hover:bg-[#E8D44D]/10"
              style={{ borderColor: POR_YELLOW, color: POR_YELLOW }}
            >
              Join the community
            </a>
          )}
        </div>
      </section>

      {/* ═══ WHEN / WHERE ═══ */}
      <section className="bg-[#1a1a14] px-6 py-14 sm:py-20">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-10">
          {/* When */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-60 mb-4" style={{ color: POR_YELLOW }}>When</p>
            <div className="space-y-4">
              <div>
                <h3 className="text-xs uppercase tracking-wider opacity-60" style={{ color: POR_YELLOW }}>Popup Village</h3>
                <p className="text-lg font-semibold" style={{ color: POR_YELLOW }}>Jan 15 – Feb 15, 2026</p>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider opacity-60" style={{ color: POR_YELLOW }}>Hacker House</h3>
                <p className="text-lg font-semibold" style={{ color: POR_YELLOW }}>Dec 1, 2025 – Apr 1, 2026</p>
              </div>
            </div>
          </div>
          {/* Where */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-60 mb-4" style={{ color: POR_YELLOW }}>Where</p>
            <h3 className="text-2xl font-bold mb-1" style={{ color: POR_YELLOW }}>Mũi Né</h3>
            <p className="text-sm opacity-80 mb-1" style={{ color: POR_YELLOW }}>One of the world's great kitesurf spots.</p>
            <p className="text-xs opacity-60" style={{ color: POR_YELLOW }}>* 2–3h from HCMC</p>
          </div>
        </div>
      </section>

      {/* ═══ AERIAL PHOTO ═══ */}
      <section className="w-full">
        <img src={porMuiNeAerial} alt="Mũi Né aerial view" className="w-full h-48 sm:h-72 object-cover" loading="lazy" />
      </section>

      {/* ═══ LIFESTYLE PHOTO GRID ═══ */}
      <section className="bg-[#1a1a14] px-4 py-10 sm:py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { src: porPhoneFree, caption: "Quiet zones & phone‑free sprints" },
            { src: porSimpleFood, caption: "Simple, nourishing food cadence" },
            { src: porKitesurfActivity, caption: "Kitesurf, beach runs, chess & techno" },
            { src: porDeepWork, caption: "Drop your stress & co-work, elite deep work" },
          ].map(({ src, caption }) => (
            <div key={caption} className="flex flex-col gap-2">
              <img src={src} alt={caption} className="w-full aspect-[3/4] object-cover rounded-lg" loading="lazy" />
              <p className="text-[11px] sm:text-xs leading-tight opacity-80" style={{ color: POR_YELLOW }}>{caption}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ TWO TRACKS ═══ */}
      <section className="bg-[#1a1a14] px-6 py-14 sm:py-20">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="border rounded-xl p-5 sm:p-6" style={{ borderColor: `${POR_YELLOW}30` }}>
            <h3 className="text-xs uppercase tracking-wider opacity-60 mb-1" style={{ color: POR_YELLOW }}>Popup Village</h3>
            <p className="text-lg font-bold mb-3" style={{ color: POR_YELLOW }}>Jan 15 – Feb 15</p>
            <p className="text-sm leading-relaxed opacity-80" style={{ color: POR_YELLOW }}>
              A concentrated month for maximum reset. Curated schedule, shared meals, and structured deep‑work sprints.
            </p>
          </div>
          <div className="border rounded-xl p-5 sm:p-6" style={{ borderColor: `${POR_YELLOW}30` }}>
            <h3 className="text-xs uppercase tracking-wider opacity-60 mb-1" style={{ color: POR_YELLOW }}>Hacker House</h3>
            <p className="text-lg font-bold mb-3" style={{ color: POR_YELLOW }}>Dec 1 – Apr 1</p>
            <p className="text-sm leading-relaxed opacity-80" style={{ color: POR_YELLOW }}>
              Longer window for shipping serious work with a calm body. Fewer group rituals, more self‑directed flow.
            </p>
          </div>
        </div>
        <p className="max-w-3xl mx-auto text-xs opacity-50 mt-6 text-center" style={{ color: POR_YELLOW }}>
          Note: Provided date context includes Dec 1, 2025 → Apr 1, 2026. Select the window that fits your focus.
        </p>
      </section>

      {/* ═══ WEEKDAY ROUTINE ═══ */}
      <section className="bg-[#1a1a14] px-6 py-14 sm:py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: POR_YELLOW }}>Weekdays Routine</h2>
          <p className="text-sm opacity-70 mb-8 max-w-xl" style={{ color: POR_YELLOW }}>
            Two deep‑work blocks aligned with circadian energy, plus ocean‑air movement in between. Evenings downshift—so sleep and focus compound.
          </p>
          <div className="space-y-0">
            {routineItems.map(({ time, label }) => (
              <div
                key={time}
                className="flex items-center gap-4 py-3 border-b"
                style={{ borderColor: `${POR_YELLOW}15` }}
              >
                <span className="text-xs font-mono w-24 flex-shrink-0 opacity-60" style={{ color: POR_YELLOW }}>{time}</span>
                <span className="text-sm font-medium" style={{ color: POR_YELLOW }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ROUTINE PHOTOS ═══ */}
      <section className="bg-[#1a1a14] px-4 py-10">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { src: porRealTalk, caption: "Real talk, ocean air", aspect: "aspect-video" },
            { src: porSimpleFood, caption: "Simple food", aspect: "aspect-[3/4]" },
            { src: porSunMobility, caption: "Sun + Mobility", aspect: "aspect-[3/4]" },
            { src: porPhoneFree, caption: "Phone‑free sprints", aspect: "aspect-[3/4]" },
          ].map(({ src, caption, aspect }) => (
            <div key={caption} className="flex flex-col gap-2">
              <img src={src} alt={caption} className={`w-full ${aspect} object-cover rounded-lg`} loading="lazy" />
              <p className="text-[11px] sm:text-xs opacity-80" style={{ color: POR_YELLOW }}>{caption}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ VALUES ═══ */}
      <section
        className="relative px-6 py-14 sm:py-20"
        style={{ backgroundImage: `url(${porHeroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {values.map((v) => (
            <div
              key={v}
              className="border rounded-xl p-5 backdrop-blur-sm bg-black/20"
              style={{ borderColor: `${POR_YELLOW}40` }}
            >
              <p className="text-sm leading-relaxed" style={{ color: POR_YELLOW }}>{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="bg-[#1a1a14] px-6 py-14 sm:py-20">
        <div className="max-w-2xl mx-auto space-y-0">
          {faqItems.map(({ q, a }, i) => (
            <div key={q} className="border-b" style={{ borderColor: `${POR_YELLOW}15` }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between py-4 text-left"
              >
                <span className="text-sm font-semibold" style={{ color: POR_YELLOW }}>{q}</span>
                {openFaq === i ? (
                  <ChevronUp className="h-4 w-4 flex-shrink-0" style={{ color: POR_YELLOW }} />
                ) : (
                  <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: POR_YELLOW }} />
                )}
              </button>
              {openFaq === i && (
                <p className="text-sm opacity-70 pb-4 leading-relaxed" style={{ color: POR_YELLOW }}>{a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FOOTER CTA ═══ */}
      <section className="bg-[#1a1a14] px-6 py-12 text-center">
        <a
          href="https://x.com/proofofretreat"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-2.5 rounded-full border text-sm font-medium transition-colors hover:bg-[#E8D44D]/10"
          style={{ borderColor: POR_YELLOW, color: POR_YELLOW }}
        >
          Ask questions in DM
        </a>
      </section>
    </article>
  );
};
