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
const POR_BG = "#141410";
const SERIF = "'Playfair Display', 'Georgia', serif";
const SANS = "'DM Sans', system-ui, sans-serif";

const routineItems = [
  { time: "08:00–09:00", label: "Sun + Mobility" },
  { time: "09:00–12:00", label: "Light Breakfast, Slow Morning" },
  { time: "12:00–16:00", label: "Deep Work Block (No Phones)" },
  { time: "16:00–19:00", label: "Kitesurfing, Chill, Sunset" },
  { time: "19:00–21:00", label: "Dinner & Social" },
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
    <article className="w-full overflow-y-auto" style={{ color: POR_YELLOW, background: POR_BG }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ═══ HERO ═══ */}
      <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
        <img
          src={porHeroBg}
          alt="Kitesurfing in Mũi Né"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        {/* Very subtle overlay — let the golden-hour photo breathe */}
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative z-10 flex flex-col items-center text-center px-6 gap-6 max-w-4xl">
          <h1
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.05] italic"
            style={{ color: POR_YELLOW, fontFamily: SERIF }}
          >
            Reset your body.
            <br />
            Let your brain thrive.
          </h1>

          <img src={porLogo} alt="Proof of Retreat logo" className="h-24 sm:h-32 md:h-36 my-4" />

          <p
            className="max-w-xl text-sm sm:text-base md:text-lg leading-relaxed opacity-90"
            style={{ color: POR_YELLOW, fontFamily: SERIF }}
          >
            Ocean wind, sunlight, movement, simple food, and a thoughtful cadence do the heavy lifting. You just arrive.
          </p>

          {village.telegram_url && (
            <a
              href={village.telegram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-8 py-3 rounded-none border text-sm tracking-widest uppercase transition-all duration-300 hover:bg-[#E8D44D] hover:text-[#141410]"
              style={{ borderColor: POR_YELLOW, color: POR_YELLOW, fontFamily: SANS }}
            >
              Join the community
            </a>
          )}
        </div>
      </section>

      {/* ═══ WHEN / WHERE ═══ */}
      <section style={{ background: POR_BG }} className="px-6 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-16">
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.3em] mb-8 opacity-50"
              style={{ color: POR_YELLOW, fontFamily: SANS }}
            >
              When
            </p>
            <div className="space-y-8">
              <div>
                <h3 className="text-[11px] uppercase tracking-[0.2em] opacity-50 mb-1" style={{ color: POR_YELLOW, fontFamily: SANS }}>
                  Popup Village
                </h3>
                <p className="text-xl sm:text-2xl font-semibold italic" style={{ color: POR_YELLOW, fontFamily: SERIF }}>
                  Jan 15 – Feb 15, 2026
                </p>
              </div>
              <div>
                <h3 className="text-[11px] uppercase tracking-[0.2em] opacity-50 mb-1" style={{ color: POR_YELLOW, fontFamily: SANS }}>
                  Hacker House
                </h3>
                <p className="text-xl sm:text-2xl font-semibold italic" style={{ color: POR_YELLOW, fontFamily: SERIF }}>
                  Dec 1, 2025 – Apr 1, 2026
                </p>
              </div>
            </div>
          </div>
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.3em] mb-8 opacity-50"
              style={{ color: POR_YELLOW, fontFamily: SANS }}
            >
              Where
            </p>
            <h3 className="text-3xl sm:text-4xl font-bold italic mb-2" style={{ color: POR_YELLOW, fontFamily: SERIF }}>
              Mũi Né
            </h3>
            <p className="text-base opacity-80 mb-2" style={{ color: POR_YELLOW, fontFamily: SERIF }}>
              One of the world's great kitesurf spots.
            </p>
            <p className="text-xs opacity-40" style={{ color: POR_YELLOW, fontFamily: SANS }}>
              * 2–3h from HCMC
            </p>
          </div>
        </div>
      </section>

      {/* ═══ AERIAL PHOTO ═══ */}
      <section className="w-full">
        <img src={porMuiNeAerial} alt="Mũi Né aerial view" className="w-full h-56 sm:h-80 md:h-[28rem] object-cover" loading="lazy" />
      </section>

      {/* ═══ LIFESTYLE PHOTO GRID ═══ */}
      <section style={{ background: POR_BG }} className="px-6 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {[
            { src: porPhoneFree, caption: "Quiet zones & phone‑free sprints" },
            { src: porSimpleFood, caption: "Simple, nourishing food cadence" },
            { src: porKitesurfActivity, caption: "Kitesurf, beach runs, chess & techno" },
            { src: porDeepWork, caption: "Drop your stress & co-work, elite deep work" },
          ].map(({ src, caption }) => (
            <div key={caption} className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-sm">
                <img
                  src={src}
                  alt={caption}
                  className="w-full aspect-[3/4] object-cover transition-transform duration-700 hover:scale-105"
                  loading="lazy"
                />
              </div>
              <p className="text-[11px] sm:text-xs leading-snug opacity-70" style={{ color: POR_YELLOW, fontFamily: SANS }}>
                {caption}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ TWO TRACKS ═══ */}
      <section style={{ background: POR_BG }} className="px-6 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
          <div className="border rounded-sm p-8 sm:p-10" style={{ borderColor: `${POR_YELLOW}20` }}>
            <h3 className="text-[11px] uppercase tracking-[0.2em] opacity-50 mb-2" style={{ color: POR_YELLOW, fontFamily: SANS }}>
              Popup Village
            </h3>
            <p className="text-xl sm:text-2xl font-bold italic mb-4" style={{ color: POR_YELLOW, fontFamily: SERIF }}>
              Jan 15 – Feb 15
            </p>
            <p className="text-sm leading-[1.8] opacity-70" style={{ color: POR_YELLOW, fontFamily: SERIF }}>
              A concentrated month for maximum reset. Curated schedule, shared meals, and structured deep‑work sprints.
            </p>
          </div>
          <div className="border rounded-sm p-8 sm:p-10" style={{ borderColor: `${POR_YELLOW}20` }}>
            <h3 className="text-[11px] uppercase tracking-[0.2em] opacity-50 mb-2" style={{ color: POR_YELLOW, fontFamily: SANS }}>
              Hacker House
            </h3>
            <p className="text-xl sm:text-2xl font-bold italic mb-4" style={{ color: POR_YELLOW, fontFamily: SERIF }}>
              Dec 1 – Apr 1
            </p>
            <p className="text-sm leading-[1.8] opacity-70" style={{ color: POR_YELLOW, fontFamily: SERIF }}>
              Longer window for shipping serious work with a calm body. Fewer group rituals, more self‑directed flow.
            </p>
          </div>
        </div>
        <p className="max-w-4xl mx-auto text-[11px] opacity-30 mt-10 text-center" style={{ color: POR_YELLOW, fontFamily: SANS }}>
          Note: Provided date context includes Dec 1, 2025 → Apr 1, 2026. Select the window that fits your focus.
        </p>
      </section>

      {/* ═══ WEEKDAY ROUTINE ═══ */}
      <section style={{ background: POR_BG }} className="px-6 py-20 sm:py-28">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold italic mb-3" style={{ color: POR_YELLOW, fontFamily: SERIF }}>
            Weekdays Routine
          </h2>
          <p className="text-sm sm:text-base opacity-60 mb-12 max-w-xl leading-relaxed" style={{ color: POR_YELLOW, fontFamily: SERIF }}>
            Two deep‑work blocks aligned with circadian energy, plus ocean‑air movement in between. Evenings downshift—so sleep and focus compound.
          </p>
          <div className="space-y-0">
            {routineItems.map(({ time, label }) => (
              <div
                key={time}
                className="flex items-center gap-6 py-5 border-b"
                style={{ borderColor: `${POR_YELLOW}10` }}
              >
                <span className="text-xs w-28 flex-shrink-0 opacity-40 tracking-wider" style={{ color: POR_YELLOW, fontFamily: SANS }}>
                  {time}
                </span>
                <span className="text-sm sm:text-base font-medium" style={{ color: POR_YELLOW, fontFamily: SERIF }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ROUTINE PHOTOS ═══ */}
      <section style={{ background: POR_BG }} className="px-6 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
          {[
            { src: porRealTalk, caption: "Real talk, ocean air" },
            { src: porSimpleFood, caption: "Simple food" },
            { src: porSunMobility, caption: "Sun + Mobility" },
            { src: porPhoneFree, caption: "Phone‑free sprints" },
          ].map(({ src, caption }) => (
            <div key={caption} className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-sm">
                <img
                  src={src}
                  alt={caption}
                  className="w-full aspect-[3/4] object-cover transition-transform duration-700 hover:scale-105"
                  loading="lazy"
                />
              </div>
              <p className="text-[11px] sm:text-xs opacity-60" style={{ color: POR_YELLOW, fontFamily: SANS }}>
                {caption}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ VALUES ═══ */}
      <section
        className="relative px-6 py-24 sm:py-32"
        style={{ backgroundImage: `url(${porHeroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold italic mb-12 text-center"
            style={{ color: POR_YELLOW, fontFamily: SERIF }}
          >
            Who this is for
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {values.map((v) => (
              <div
                key={v}
                className="border rounded-sm p-6 backdrop-blur-md bg-black/30"
                style={{ borderColor: `${POR_YELLOW}25` }}
              >
                <p className="text-sm leading-[1.8]" style={{ color: POR_YELLOW, fontFamily: SERIF }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section style={{ background: POR_BG }} className="px-6 py-24 sm:py-32">
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold italic mb-12"
            style={{ color: POR_YELLOW, fontFamily: SERIF }}
          >
            FAQ
          </h2>
          <div className="space-y-0">
            {faqItems.map(({ q, a }, i) => (
              <div key={q} className="border-b" style={{ borderColor: `${POR_YELLOW}12` }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-6 text-left group"
                >
                  <span
                    className="text-base font-medium transition-opacity group-hover:opacity-100"
                    style={{ color: POR_YELLOW, fontFamily: SERIF, opacity: openFaq === i ? 1 : 0.8 }}
                  >
                    {q}
                  </span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0 opacity-40" style={{ color: POR_YELLOW }} />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-40" style={{ color: POR_YELLOW }} />
                  )}
                </button>
                {openFaq === i && (
                  <p
                    className="text-sm opacity-60 pb-6 leading-[1.8] pl-0"
                    style={{ color: POR_YELLOW, fontFamily: SERIF }}
                  >
                    {a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER CTA ═══ */}
      <section style={{ background: POR_BG }} className="px-6 py-20 text-center">
        <p
          className="text-2xl sm:text-3xl font-bold italic mb-8"
          style={{ color: POR_YELLOW, fontFamily: SERIF }}
        >
          Ready to reset?
        </p>
        <a
          href="https://x.com/proofofretreat"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-8 py-3 rounded-none border text-sm tracking-widest uppercase transition-all duration-300 hover:bg-[#E8D44D] hover:text-[#141410]"
          style={{ borderColor: POR_YELLOW, color: POR_YELLOW, fontFamily: SANS }}
        >
          Ask questions in DM
        </a>
      </section>
    </article>
  );
};
