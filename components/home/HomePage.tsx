"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { nanoid } from "nanoid";
import { PRIMARY_REGION_HUB_PATH } from "@/lib/routes/primary-region";
import { BusinessPayload } from "@/lib/search/types";
import { FeaturedBusinessesMasonry } from "@/components/home/FeaturedBusinessesMasonry";
import { RemoteCoverImage } from "@/components/discovery/RemoteCoverImage";

type Rec = {
  business_id: string;
  rank: number;
  headline: string;
  explanation: string;
  highlighted_tags: string[];
  business: {
    id?: string;
    name?: string;
    address?: string | null;
    lat?: number;
    lng?: number;
    phone?: string | null;
    website?: string | null;
    listing_rating?: number | null;
    slug?: string;
    tags?: string[];
    ai_summary?: string | null;
    image_url?: string | null;
  };
};

type SearchJson = {
  query: string;
  query_hash: string;
  summary: string;
  recommendations: Rec[];
  suggestions?: string[];
  cached: boolean;
  cache_id?: string;
  error?: string;
};

function sessionKey() {
  if (typeof window === "undefined") return "";
  let s = localStorage.getItem("whereto30a_session");
  if (!s) {
    s = nanoid();
    localStorage.setItem("whereto30a_session", s);
  }
  return s;
}

/** Placeholder assets from design/homepage.html (wire real URLs later). */
const IMG = {
  hero:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCsXovFV1neXjTq-4mDbgPnbeulhSJTjrnA8HjhYxq8ia7daxCG_LgukxpGv4QFsulirvaswIA6YRwYJFSNId1ug0GSb0xSB5vMk2oIfL018BIDjnqCxf8mngM3LnJVaLLOz3m0qpr65y-xGAT3ZUZZY-fO437YIwlfzKPcpingFhsBIKN7sgwtVTuDefQ2_q6okMXgBEOT4EPmHvjNaVcN3NqSIl8bkXfWsg_h-MxXYQMT-vBNtntZc6L7fARzSUTdkBnVQMREwlc",
  curator1:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC3MZ7VIQ6AKoMetZk_0Piq6Kfbb1o0WgP66XvRwgNNmQsTCShkIlF39ea-HCTRiKDmEy9UCbSmoewmrVymj4aGOK-TEME4vLQJi3Kg2mYE07KtrgsEnpXWLfTc64NxgX_G5SCvnUzohQfxvrAQUkH3t3nYAJR7PeohFN97Cus7BAN1sq7dVMt37Gq4EJlTDe8MIyTbfwp4yA3NZ4P-N2ZaWJW1VBYCZuzipCEn5M-UnQLyiv3Zqf0zbx9d8biT0Ds4eCtqkoiZpO8",
  curator2:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC0gdiF22dhhvVxfDp3vJX14yaKA_hNHnVKisHnlXvbArm71cSx2JMl_UJuWSS3KFfgQ4jMD6_7Dhe2QRr0jaUqAu1mAKPMZxiV1xqfAy51DjPjLuZrvsWpSYLoyfuoh3M9le8pKIUglSzuRrSviOxn-HhpbMWicaPMAUI5OGG9JTW0NbKOUx2Q6SbEnRmKEZZ_QIRgvhUXjWGChUIsJXzcrkv4o46ZtNOntMM1ZghB4YejPNnniL_bTjLaAfW_t1gHQtsOR5arlG0",
  curator3:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBIDuncMR9xcoWqFTjXXW2T40dTZtW_oRc6n0OmMmQ9US43lBOjnlTyzHKnqEF0AKHlQWjl1XG9EQoKadFs9fCeukYrRLQU-0HA0jdScWJGwDOVTj_FTkMUQ7xUaumtuMJ-AwIEWKbcsyVLxcbexfd-boU-lxHA810HjdRYThnUz26cPSm3ZUzofQV9ob8z672SGi7jiWJ460iiY-y3_grlBTKtaUNfWdFRp8tpS-zQye2KOIWiWH34bfuzrRhosbbTVyE4Tj615BA",
  townSeaside:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBl2jpZmUuveB4onwYrkKMpxNkFpLvrYOGCS1o-MontRKuchdeQUgtS70hIWo_kyZbpSkSn1ozqN-uCgQG2YpI6xvJvtDD0EzvhE1c5tJrffE8pcNOdTeiRpyv3Q8tkLUjgCeuVK7qb5vh7BxmeA0iAIai06S6Cn17PgIyOlZXhnEwZ8Ma56ct6eKsFLWPZ_sK6h0IIHeLBgu0WSrTrlvaIBpoerCnGq3z6L2wNp0U1uu3R8XSyWrut0PQjyaLkt-UeJk2vP8ak4C4",
  townAlys:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuD_VzAJhGmAdDQUlhuouuBfJQ5rJfCAd5sS-8xNAvCqPC7BNVOQoGRmBnUZIcedk-mjflEc0PgayAxG9bn0uk1MSyYVHY5sMUVn29EIHTOpOIbMHO1ti9D6u0Ts3fVdjQgNfoplDqXTFVWFpKhQ7ItLmI-h0QwpwnKnt0InneV_eJ0u1r4oiVStTv8Cp7H3gibz8OodsSMeTYddKQqDIHEv9S4NDLCR8V-dQ85394-2uZMllj6vyaMVb4uDT5Jfel1guvU5bOKSULQ",
  townRosemary:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuD0U-BfohSaGYnILu4WO0mZsVaEEPpzxfj2vgG9m6eQ8FAR5gYQrfynDCoi9lkk-dtldDcdSgYO4PLK8M6p1L7pA2Y1hP1gUX-O8PYG1z_GHtZyuaWwcVlkCU57Y-VB1qyD2S8G4OhMmK8Y6dtwzYVr68rkzYx_KlC6C6VdPizF3FxD1q4nJ72Esc8tsFIWXD2Hj0w7WweQqcPytPgtX1HaFs5neMmTK3wKw2PXofQwg4WF5rAxRBcYtGjbtQPafeX8MM0JI_4AfUg",
  townGrayton:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDHY82ur2HneaSAHqilQS1abVSxBAKq3Cv8JmIdVkTUiKGnHfth8KUD8auXhyPaWzO96i27GPqnRRd8bH8WVqAB20YIjQ70eR7oxG4n_WI4gP7uLgtdfm-pnaC3gRTgT-ymeZsTOITo6EpfixAG2Bi9l80WPQtrPZdJ2F5hq55ryYjkm5TZx4BpqfzWM1mV_4AKKvXvy2F8MZTQIINrsknMEnE74lWw07fh_XbX8cjGZbcAdEKqNjnb_K-H-__iiRhYtzFPI0cmsdw",
  catStays:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuChsAjsgiQHhlWpmT10UaSmjJHBkZydxQTsx_F_4RFlVoEez_CPeWPvdsZkYuTOgZ67KpDY0r3WyOnIaZiRaTjy-g2iFJfpvM9qQqhZyx8EM5xs57cbh_kKQKBPNTuONe0ApIHYQLWLuFyYrEnOZ5Kd9HSZw8Ntodeunv-ndNADk0fGt5Ofs7h1cx8UKThyZWZvSM9M4vVUNib2HxLlLjlTgRIeT2aIXVtuBLmPAN_JmCVR3KmLHQ4Q_XivoP6XC6X5CMtKnaPAcxo",
  catDining:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAZ-wPwfCxLDpajut0IygMOiy-6WZEA7-WfUdg7y2pik100PNqeoMlmI9aYw5Vgj1QKY50Y_mSVGzSx3HBM3iItV1s3oiUq-yx5oRL1cXSTvq4YKF46LsBNMCieHrA7lbHZDFfvmN0QPFsfkbJpWWK8agvofuM096ok6-QORIJZ5xYDQGCWuTQH5NZ9iToJBISkitQ5dItEUa1HraFITIVjaJGjLd1jf3bvNswFt-9NlYW8xQk_nYFpXDJLP1-csb4mWEeNduWoZEU",
  catFamily:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuD9qSAK7hoCLLe08xyIvYfDIHlj_77Z28WGSCPWac22rpMqZYoOfNc3a_I0Cuv80fwt7x4bVvW-xxc1GmixpUE6qhC-AYZ8B6hcycJdvdvHCxNruuyVMDf1_zzLbdH8sWv-Z4IIpX_NI3xJrH3EMQ64CaY-R7P-aBNYUDuSi8zCj-xq_6F83avgaLlGbMLTfH3eR9nbsappGz7GPfjU8loBIOUmNTk6FRj1c1C0MYXnz_sbTdMEkCuYWSbhQIg9KRiYDqJ7nWEkOhg",
  catTours:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDyZQPvVuLvTgKnsh3FZ4y5V_Jc-Vc5OWojRxFo0iCIz9Eqeqbp2V898uoefiYtgdVx2mMU6ZuopyhQNlwIXv7GC6HvKTaysHltsuEcQfeScZ23RdmxAJTSwPC4AyQbz3kJbn20cyUFcOBrLvkUCEX23CgWJs4yoOHjwlxVn9Ml36fr_391KV1DUWrn7ahRwYPya-2idLIySlzOttAv8k-M2xnCGn7ivsTlDAkq8-CsBnC-7cAV-Rnqinb9tZgiDjqz2gGoyiJl74k",
} as const;

const CURATOR_CARDS = [
  {
    image: IMG.curator1,
    alt: "gourmet seafood dish with fresh shrimp and scallops on a white plate in an elegant restaurant",
    badge: "RESTAURANT",
    title: "The Citizen",
    meta: "Alys Beach • Modern Coastal",
    rating: "4.9",
    blurb:
      "Based on your interest in minimalist design and craft cocktails, The Citizen's atmosphere perfectly matches your aesthetic. It's the highest-rated spot for 'clean eating' in Alys Beach.",
    cta: "Book Reservation",
    ctaHref: "#",
  },
  {
    image: IMG.curator2,
    alt: "luxury private yoga session on a white sand beach at sunrise with turquoise water",
    badge: "EXPERIENCE",
    title: "Sunrise Dune Yoga",
    meta: "Grayton Beach • Wellness",
    rating: "5.0",
    blurb:
      "You previously looked for 'quiet morning activities'. This session is limited to 4 guests and takes place in a secluded dune area far from the main crowds.",
    cta: "Check Availability",
    ctaHref: "#",
  },
  {
    image: IMG.curator3,
    alt: "modern beach house terrace with white sofas and view of sunset over the ocean",
    badge: "STAY",
    title: "The White House",
    meta: "Seaside • Luxury Villa",
    rating: "4.8",
    blurb:
      "This property has a rooftop deck similar to the one you saved last week. It's also within a 3-minute walk of Bud & Alley's.",
    cta: "View Property",
    ctaHref: "#",
  },
] as const;

const MOOD_CHIPS_DATA = [
  { label: "Relaxed" as const, hint: "relaxed day on 30A" },
  { label: "Active" as const, hint: "active outdoor things to do on 30A" },
  { label: "Family" as const, hint: "family-friendly activities on 30A" },
  { label: "Romantic" as const, hint: "romantic dinner sunset views 30A" },
] as const;

type Mood = (typeof MOOD_CHIPS_DATA)[number]["label"];

function MsIcon({
  name,
  className,
  filled,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className ?? ""}`}
      style={
        filled
          ? ({ fontVariationSettings: '"FILL" 1' } as React.CSSProperties)
          : undefined
      }
      aria-hidden
    >
      {name}
    </span>
  );
}

function DesignImg({
  src,
  alt,
  className,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      priority={priority}
      unoptimized
    />
  );
}

type TownPayload = {
  name: string;
  slug: string;
  ai_tagline?: string | null;
  ai_description?: string | null;
  hero_image_url?: string | null;
};

function cleanTownBlurb(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .replace(/^a local'?s guide to [^.?!,]+[,.]?\s*/i, "")
    .replace(/^discover\s+/i, "")
    .trim();
}

function townBlurbFallback(townName: string): string {
  const fallbackByTown: Record<string, string> = {
    "Alys Beach":
      "Whitewashed architecture, quiet lanes, and upscale dining make this one of 30A's most polished beach towns.",
    "Rosemary Beach":
      "Cobblestone lanes, boutique shopping, and lively greens give Rosemary a walkable, European-style center.",
    "Grayton Beach":
      "An artsy beach town with local character, live music, and easy access to Grayton Beach State Park.",
    Seaside:
      "Colorful cottages, iconic town squares, and family-friendly beaches make Seaside a 30A classic.",
    WaterColor:
      "Resort amenities, dune lake access, and quiet neighborhoods create a relaxed, upscale coastal base.",
  };
  return (
    fallbackByTown[townName] ??
    `${townName} offers its own mix of beaches, dining, and local spots along Florida's Scenic Highway 30A.`
  );
}

function getTownCardBlurb(town: TownPayload): string {
  const preferred = cleanTownBlurb(town.ai_description) || cleanTownBlurb(town.ai_tagline);
  if (!preferred) return townBlurbFallback(town.name);
  return preferred.charAt(0).toUpperCase() + preferred.slice(1);
}

type Props = {
  featureFlags?: Record<string, boolean>;
  featuredBusinesses?: (BusinessPayload & {
    featured_title?: string | null;
    featured_description?: string | null;
    badge?: string | null;
  })[];
  towns?: TownPayload[];
  heroSettings?: {
    imageUrl: string;
    title: string;
    subtitle: string;
    searchPlaceholder: string;
  };
};

export function HomePage({
  featureFlags = {},
  featuredBusinesses = [],
  towns = [],
  heroSettings = {
    imageUrl: IMG.hero,
    title: "I'm looking for...",
    subtitle: "Your local guide to 30A. Search towns, guides, and trusted local picks.",
    searchPlaceholder: "Search anything on 30A...",
  },
}: Props) {
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const logImpressions = useCallback(async (payload: SearchJson) => {
    const session_id = sessionKey();
    await fetch("/api/impressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id,
        items: payload.recommendations.map((r, i) => ({
          business_id: r.business_id,
          query_hash: payload.query_hash,
          rank_position: i + 1,
        })),
      }),
    });
  }, []);

  useEffect(() => {
    const initial = searchParams.get("q");
    if (initial?.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(initial)}`;
    }
  }, [searchParams]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    window.location.href = `/search?q=${encodeURIComponent(q)}`;
  }

  function onChangeInput(v: string) {
    setQ(v);
  }

  function scrollToHero() {
    document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
    requestAnimationFrame(() => heroInputRef.current?.focus());
  }

  return (
    <div className="min-h-screen bg-background font-body text-on-surface antialiased">
      <div>
        {featureFlags["search"] === true && (
          <section
            id="hero"
            className="relative flex min-h-[95vh] w-full flex-col items-center justify-center"
          >
            {/* Full-bleed hero image with Ken Burns effect */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              <div className="absolute inset-0 img-editorial">
                <DesignImg
                  src={heroSettings.imageUrl}
                  alt="Cinematic wide shot of 30A beach with sugar-white sand and turquoise gulf water under a soft pastel sunset sky"
                  className="object-cover"
                  sizes="100vw"
                  priority
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-background" />
            </div>

            {/* Hero content */}
            <div className="relative z-10 flex flex-col items-center justify-center px-4 text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 backdrop-blur-md">
                <MsIcon name="auto_awesome" className="!text-sm text-white" filled />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-white">
                  Local Guide to 30A
                </span>
              </div>

              <h1 className="text-editorial-hero mb-6 max-w-4xl text-white drop-shadow-lg">
                {heroSettings.title}
              </h1>

              <p className="mb-10 max-w-2xl text-lg leading-relaxed text-white/90 md:text-xl">
                {heroSettings.subtitle}
              </p>

              {/* Minimal, centered search bar */}
              <form
                onSubmit={onSubmit}
                className="mx-auto w-full max-w-[640px]"
              >
                <div className="relative">
                  <MsIcon
                    name="search"
                    className="absolute left-6 top-1/2 -translate-y-1/2 !text-xl text-zinc-400"
                  />
                  <input
                    ref={heroInputRef}
                    name="q"
                    value={q}
                    onChange={(e) => onChangeInput(e.target.value)}
                    className="h-16 w-full rounded-full border-none bg-white/95 pl-14 pr-32 text-lg text-zinc-900 shadow-xl backdrop-blur-md transition-all placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-white/30"
                    placeholder={heroSettings.searchPlaceholder}
                    type="search"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-12 rounded-full bg-primary px-6 font-semibold text-white transition-all hover:bg-primary-light active:scale-[0.98] disabled:opacity-60"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Quick discovery prompts */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                {["Restaurants", "Coffee", "Activities", "Guides"].map((label) => (
                  <Link
                    key={label}
                    href={`/search?q=${encodeURIComponent(label.toLowerCase() + " 30A")}`}
                    className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
              <div className="animate-scroll-bounce flex flex-col items-center gap-2 text-white/60">
                <span className="text-xs font-medium uppercase tracking-widest">Explore</span>
                <MsIcon name="keyboard_arrow_down" className="!text-2xl" />
              </div>
            </div>
          </section>
        )}

        {featureFlags["featured_business"] === true && featuredBusinesses.length > 0 && (
          <section id="section-featured" className="bg-background py-20 md:py-28">
            <div className="mx-auto max-w-[1280px] px-5 sm:px-6 lg:px-8">
              <div className="mb-12 md:mb-16">
                <p className="text-eyebrow mb-3">Editor's Picks</p>
                <h2 className="text-editorial-headline text-4xl text-primary sm:text-5xl">
                  Featured Today
                </h2>
              </div>
              <FeaturedBusinessesMasonry businesses={featuredBusinesses} />
            </div>
          </section>
        )}

        {err ? (
          <div className="mx-auto max-w-screen-xl px-6 py-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {err}
            </div>
          </div>
        ) : null}

        {featureFlags["curator"] === true && (
          <section
            id="section-curator"
            className="overflow-hidden bg-background py-20 md:py-28"
          >
            <div className="mx-auto max-w-screen-xl px-5 sm:px-6 lg:px-8">
              <div className="mb-12 md:mb-16">
                <p className="text-eyebrow mb-3">Personalized</p>
                <h2 className="text-editorial-headline text-4xl text-primary sm:text-5xl">
                  Curated for You
                </h2>
              </div>

              {/* Horizontal scroll carousel */}
              <div className="editorial-scroll scrollbar-hide -mx-5 px-5 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                {CURATOR_CARDS.map((card) => (
                  <article
                    key={card.title}
                    className="editorial-card group w-[340px] overflow-hidden rounded-2xl border border-zinc-100 bg-white sm:w-[400px]"
                  >
                    {/* Horizontal layout: image left, content right */}
                    <div className="flex h-full">
                      <div className="relative w-[140px] shrink-0 overflow-hidden sm:w-[160px]">
                        <DesignImg
                          src={card.image}
                          alt={card.alt}
                          className="img-editorial-fast object-cover"
                          sizes="160px"
                        />
                        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-primary backdrop-blur-md">
                          {card.badge}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-4 sm:p-5">
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-headline text-lg font-bold leading-tight text-zinc-900 group-hover:text-primary">
                              {card.title}
                            </h3>
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {card.meta}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <MsIcon name="star" className="!text-xs text-amber-400" filled />
                            <span className="text-xs font-bold text-zinc-700">{card.rating}</span>
                          </div>
                        </div>

                        {/* Pull quote style */}
                        <div className="mb-3 flex-1 border-l-2 border-primary/20 pl-3">
                          <p className="line-clamp-4 text-sm italic leading-relaxed text-zinc-600">
                            &ldquo;{card.blurb}&rdquo;
                          </p>
                        </div>

                        <Link
                          href={card.ctaHref}
                          className="mt-auto flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary-light"
                        >
                          {card.cta}
                          <MsIcon name="arrow_forward" className="!text-sm" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="bg-background py-14">
          <div className="mx-auto max-w-screen-xl px-6">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-primary-container p-10 text-center text-on-primary md:p-16">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-400/20 blur-[100px]" />
              <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-teal-400/10 blur-[100px]" />
              <div className="relative z-10">
                <MsIcon
                  name="menu_book"
                  className="mb-6 !block !text-5xl text-on-primary-container"
                />
                <h2 className="mb-6 font-headline text-4xl font-extrabold tracking-tighter">
                  Start with the 30A Guide
                </h2>
                <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-on-primary-container">
                  New to 30A? Explore town guides, trip ideas, where to eat, and the
                  best local spots to know before you go.
                </p>
                <div className="flex flex-col justify-center gap-4 md:flex-row">
                  <Link
                    href="/guide"
                    className="rounded-full bg-surface-elevated px-8 py-4 text-lg font-bold text-primary transition-all hover:shadow-xl"
                  >
                    Explore the Guide
                  </Link>
                  <Link
                    href={PRIMARY_REGION_HUB_PATH}
                    className="rounded-full border border-on-primary/20 bg-transparent px-8 py-4 text-lg font-bold text-on-primary transition-all hover:bg-on-primary/10"
                  >
                    Browse Towns
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {featureFlags["towns"] === true && towns.length > 0 && (
          <section
            id="section-neighborhoods"
            className="bg-surface-container-low py-20 md:py-28"
          >
            <div className="mx-auto max-w-screen-xl px-5 sm:px-6 lg:px-8">
              <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end md:mb-16">
                <div>
                  <p className="text-eyebrow mb-3">Discover</p>
                  <h2 className="text-editorial-headline text-4xl text-primary sm:text-5xl">
                    Beach Towns of 30A
                  </h2>
                </div>
                <Link
                  href={PRIMARY_REGION_HUB_PATH}
                  className="group flex items-center gap-2 font-semibold text-primary transition-all hover:gap-3"
                >
                  Explore all Towns
                  <MsIcon name="arrow_forward" className="!text-lg transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Editorial town grid - larger cards with story feel */}
              <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
                {towns.map((town, index) => (
                  <Link
                    key={town.slug}
                    href={`/${town.slug}`}
                    className="group editorial-card relative overflow-hidden rounded-2xl"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden">
                      {town.hero_image_url ? (
                        <DesignImg
                          src={town.hero_image_url}
                          alt={town.name}
                          className="img-editorial-fast object-cover"
                          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/60" />
                      )}
                      <div className="editorial-gradient absolute inset-0" />

                      {/* Content overlay */}
                      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                        <h3 className="font-headline text-xl font-bold tracking-tight text-white sm:text-2xl">
                          {town.name}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/90">
                          {getTownCardBlurb(town)}
                        </p>
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          Explore
                          <MsIcon name="arrow_forward" className="!text-sm" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {featureFlags["categories"] === true && (
          <section
            id="section-categories"
            className="mx-auto max-w-7xl px-5 py-20 sm:px-6 md:py-28 lg:px-8"
          >
            <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end md:mb-16">
              <div>
                <p className="text-eyebrow mb-3">Curated Discovery</p>
                <h2 className="text-editorial-headline text-4xl text-primary sm:text-5xl">
                  Explore by Category
                </h2>
              </div>
              <Link
                href={PRIMARY_REGION_HUB_PATH}
                className="group flex items-center gap-2 font-semibold text-primary transition-all"
              >
                View all
                <MsIcon name="arrow_forward" className="!text-lg transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Magazine spread layout - staggered grid */}
            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              <Link
                href="/search?q=beachfront+stays+30A"
                className="group editorial-card"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl">
                  <DesignImg
                    src={IMG.catStays}
                    alt="Modern white architectural beach house with large glass windows reflecting the emerald coast at noon"
                    className="img-editorial-fast object-cover"
                    sizes="(min-width: 1024px) 25vw, 50vw"
                  />
                  <div className="editorial-gradient absolute inset-0" />
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <h3 className="font-headline text-lg font-bold text-white sm:text-xl">
                      Beachfront Stays
                    </h3>
                    <p className="mt-1 text-sm text-white/80">
                      Wake up to the sound of waves
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                href="/search?q=seaside+dining+30A"
                className="group editorial-card lg:translate-y-8"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl">
                  <DesignImg
                    src={IMG.catDining}
                    alt="Upscale outdoor restaurant terrace overlooking the gulf with string lights and elegant wooden furniture"
                    className="img-editorial-fast object-cover"
                    sizes="(min-width: 1024px) 25vw, 50vw"
                  />
                  <div className="editorial-gradient absolute inset-0" />
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <h3 className="font-headline text-lg font-bold text-white sm:text-xl">
                      Seaside Dining
                    </h3>
                    <p className="mt-1 text-sm text-white/80">
                      Fresh catches and coastal spirits
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                href="/search?q=family+friendly+30A"
                className="group editorial-card"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl">
                  <DesignImg
                    src={IMG.catFamily}
                    alt="Happy family riding bicycles along a scenic bike path lined with dunes and white picket fences"
                    className="img-editorial-fast object-cover"
                    sizes="(min-width: 1024px) 25vw, 50vw"
                  />
                  <div className="editorial-gradient absolute inset-0" />
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <h3 className="font-headline text-lg font-bold text-white sm:text-xl">
                      Family Fun
                    </h3>
                    <p className="mt-1 text-sm text-white/80">
                      Create memories along the shore
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                href="/search?q=town+tours+30A"
                className="group editorial-card lg:translate-y-8"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-2xl">
                  <DesignImg
                    src={IMG.catTours}
                    alt="Aerial view of seaside architectural style with iconic white tower and green common spaces"
                    className="img-editorial-fast object-cover"
                    sizes="(min-width: 1024px) 25vw, 50vw"
                  />
                  <div className="editorial-gradient absolute inset-0" />
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <h3 className="font-headline text-lg font-bold text-white sm:text-xl">
                      Town Tours
                    </h3>
                    <p className="mt-1 text-sm text-white/80">
                      Walk through coastal masterpieces
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}

        {featureFlags["plan-your-trip"] === true && (
          <section
            id="section-plan-ai"
            className="mx-auto max-w-5xl px-8 py-24 text-center"
          >
            <div className="relative overflow-hidden rounded-[2.5rem] bg-primary-container p-16 text-on-primary">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-400/20 blur-[100px]" />
              <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-teal-400/10 blur-[100px]" />
              <div className="relative z-10">
                <MsIcon
                  name="auto_awesome"
                  className="mb-6 !block !text-5xl text-on-primary-container"
                />
                <h2 className="mb-6 font-headline text-4xl font-extrabold tracking-tighter">
                  Plan your 30A trip
                </h2>
                <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-on-primary-container">
                  &ldquo;Find me a dog-friendly beachfront cottage in Grayton
                  Beach for a family of four, near a great seafood spot.&rdquo; Start
                  with search, town guides, and local picks built around how people
                  actually experience the coast.
                </p>
                <div className="flex flex-col justify-center gap-4 md:flex-row">
                  <button
                    type="button"
                    onClick={scrollToHero}
                    className="rounded-full bg-surface-elevated px-8 py-4 text-lg font-bold text-primary transition-all hover:shadow-xl"
                  >
                    Start Searching
                  </button>
                  <Link
                    href={PRIMARY_REGION_HUB_PATH}
                    className="rounded-full border border-on-primary/20 bg-transparent px-8 py-4 text-lg font-bold text-on-primary transition-all hover:bg-on-primary/10"
                  >
                    Browse Map
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
