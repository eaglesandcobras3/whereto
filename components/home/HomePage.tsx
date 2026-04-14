"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { nanoid } from "nanoid";
import { PRIMARY_REGION_HUB_PATH } from "@/lib/routes/primary-region";
import { BusinessPayload } from "@/lib/search/types";

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

type Props = {
  featureFlags?: Record<string, boolean>;
  featuredBusinesses?: (BusinessPayload & { 
    featured_title?: string | null; 
    featured_description?: string | null; 
    badge?: string | null;
  })[];
};

export function HomePage({ 
  featureFlags = {}, 
  featuredBusinesses = [] 
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
      setQ(initial);
      // Redirect to search page if there's a query
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
      <nav className="fixed top-0 z-50 w-full bg-background/70 shadow-design-card backdrop-blur-xl">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-6 md:px-12">
          <Link
            href="/"
            className="cursor-pointer text-2xl font-extrabold tracking-tighter text-brand-wordmark"
          >
            WhereTo30A
          </Link>
          <div className="hidden items-center space-x-10 font-headline text-sm font-semibold tracking-tight md:flex">
            {featureFlags["towns"] === true && (
              <Link
                href="/#section-neighborhoods"
                className="text-outline transition-all duration-300 ease-in-out hover:text-brand-wordmark hover:opacity-80"
              >
                Towns
              </Link>
            )}
            {featureFlags["curator"] === true && (
              <Link
                href="/#section-curator"
                className="text-outline transition-all duration-300 ease-in-out hover:text-brand-wordmark hover:opacity-80"
              >
                Experiences
              </Link>
            )}
          </div>
          <div className="flex items-center space-x-4 md:space-x-6">
            <Link
              href="/login"
              className="material-symbols-outlined text-outline transition-all hover:text-brand-wordmark"
              aria-label="Account"
            >
              person
            </Link>
            {featureFlags["plan-your-trip"] === true && (
              <button
                type="button"
                onClick={scrollToHero}
                className="scale-95 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-all hover:opacity-90 active:duration-100 md:px-8"
              >
                Plan Trip
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {featureFlags["search"] === true && (
          <section
            id="hero"
            className="relative flex h-[700px] w-full flex-col items-center justify-center"
          >
            <div className="absolute inset-0 z-0">
              <DesignImg
                src={IMG.hero}
                alt="Cinematic wide shot of 30A beach with sugar-white sand and turquoise gulf water under a soft pastel sunset sky"
                className="object-cover"
                sizes="100vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-background" />
            </div>
            <div className="relative z-10 flex flex-col items-center justify-center text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-fixed/30 px-4 py-1.5 text-primary">
                <MsIcon name="auto_awesome" className="!text-sm" filled />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Intelligent Discovery
                </span>
              </div>
              <h1 className="mb-8 font-headline text-5xl font-extrabold tracking-tighter text-primary md:text-7xl">
                I&apos;m looking for&hellip;
              </h1>
              <form
                onSubmit={onSubmit}
                className="mx-auto flex w-full max-w-[700px] gap-2 px-4"
              >
                <div className="relative flex-1">
                  <MsIcon 
                    name="search" 
                    className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/40" 
                  />
                  <input
                    ref={heroInputRef}
                    name="q"
                    value={q}
                    onChange={(e) => onChangeInput(e.target.value)}
                    className="h-16 w-full rounded-2xl border-none bg-surface-container-highest pl-14 pr-8 text-lg text-on-surface shadow-sm transition-all placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/10"
                    placeholder="Search anything on 30A..."
                    type="search"
                    autoComplete="off"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-16 rounded-2xl bg-primary px-8 font-bold text-on-primary transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                >
                  Search
                </button>
              </form>
            </div>
          </section>
        )}

        {featureFlags["featured_business"] === true && (
          <section id="section-featured" className="py-20 bg-background">
            <div className="mx-auto max-w-screen-xl px-6">
              <div className="mb-12">
                <h2 className="font-headline text-4xl font-extrabold tracking-tighter text-primary">
                  Featured Businesses
                </h2>
                <p className="mt-2 text-zinc-500">Hand-picked highlights of the Emerald Coast.</p>
              </div>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {featuredBusinesses.map((b) => (
                  <Link
                    key={b.id}
                    href={`/business/${b.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="relative aspect-video">
                      <Image
                        src={b.hero_image_url || IMG.hero}
                        alt={b.name}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {b.badge && (
                        <div className="absolute top-3 left-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white shadow-md">
                          {b.badge}
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="font-headline text-xl font-bold text-zinc-900 group-hover:text-primary transition-colors">
                        {b.name}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-600 leading-relaxed">
                        {b.featured_description || b.ai_summary || "Explore more about this local favorite."}
                      </p>
                      <div className="mt-4 flex items-center text-sm font-bold text-primary">
                        View details
                        <MsIcon name="chevron_right" className="!text-lg" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
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
            className="overflow-hidden bg-background py-32"
          >
            <div className="mx-auto max-w-screen-xl px-6">
              <div className="mb-4 flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <MsIcon
                    name="auto_awesome"
                    className="!text-lg text-primary"
                  />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  My Curator Recommendations
                </span>
              </div>
              <h2 className="mb-16 font-headline text-5xl font-extrabold text-primary">
                Curated for You
              </h2>
              <div className="hide-scrollbar flex space-x-8 overflow-x-auto pb-12">
                {CURATOR_CARDS.map((card) => (
                  <article
                    key={card.title}
                    className="min-w-[450px] overflow-hidden rounded-xl bg-surface-elevated shadow-design-card transition-transform duration-500 hover:scale-[1.02]"
                  >
                    <div className="relative h-64">
                      <DesignImg
                        src={card.image}
                        alt={card.alt}
                        className="object-cover"
                        sizes="450px"
                      />
                      <div className="absolute left-6 top-6 rounded-full bg-white/90 px-4 py-1 text-xs font-bold text-primary backdrop-blur-md">
                        {card.badge}
                      </div>
                    </div>
                    <div className="p-10">
                      <div className="mb-6 flex items-start justify-between">
                        <div>
                          <h3 className="font-headline text-2xl font-bold text-primary">
                            {card.title}
                          </h3>
                          <p className="text-sm text-on-surface-variant">
                            {card.meta}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MsIcon
                            name="star"
                            className="!text-sm text-amber-400"
                            filled
                          />
                          <span className="text-sm font-bold text-primary">
                            {card.rating}
                          </span>
                        </div>
                      </div>
                      <div className="h-[186px] rounded-lg border-l-4 border-primary/20 bg-primary/5 p-6">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                          Why our AI recommends this
                        </p>
                        <p className="text-sm italic leading-relaxed text-on-surface-variant">
                          &ldquo;{card.blurb}&rdquo;
                        </p>
                      </div>
                      <Link
                        href={card.ctaHref}
                        className="mt-8 flex w-full items-center justify-center rounded-full bg-primary py-4 font-bold text-on-primary transition-all hover:opacity-90"
                      >
                        {card.cta}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {featureFlags["towns"] === true && (
          <section
            id="section-neighborhoods"
            className="bg-surface-container-low py-32"
          >
            <div className="mx-auto max-w-screen-xl px-6">
              <div className="mb-16 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary/50">
                    The Neighborhoods
                  </span>
                  <h2 className="mt-2 font-headline text-5xl font-extrabold text-primary">
                    Icons of 30A
                  </h2>
                </div>
                <Link
                  href={PRIMARY_REGION_HUB_PATH}
                  className="border-b-2 border-primary pb-1 font-semibold text-primary transition-all hover:opacity-70"
                >
                  Explore all Towns
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
                <Link
                  href="/seaside"
                  className="group relative h-[500px] cursor-pointer overflow-hidden rounded-xl md:col-span-8"
                >
                  <DesignImg
                    src={IMG.townSeaside}
                    alt="scenic view of iconic white beach pavilion at seaside florida with boardwalk and dunes"
                    className="transition duration-700 group-hover:scale-105"
                    sizes="(min-width: 768px) 66vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-black/20 transition-all duration-500 group-hover:bg-black/10" />
                  <div className="absolute inset-0 flex flex-col justify-end p-12">
                    <h3 className="font-headline text-5xl font-extrabold tracking-tighter text-white">
                      Seaside
                    </h3>
                    <p className="mt-4 max-w-md font-medium text-white/90">
                      The birthplace of New Urbanism. Iconic pavilions, white
                      picket fences, and the spirit of summer.
                    </p>
                  </div>
                </Link>
                <Link
                  href="/alys-beach"
                  className="group relative h-[500px] cursor-pointer overflow-hidden rounded-xl md:col-span-4"
                >
                  <DesignImg
                    src={IMG.townAlys}
                    alt="minimalist stark white architecture of alys beach with courtyard and palm trees"
                    className="transition duration-700 group-hover:scale-105"
                    sizes="(min-width: 768px) 33vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-black/20 transition-all duration-500 group-hover:bg-black/10" />
                  <div className="absolute inset-0 flex flex-col justify-end p-12">
                    <h3 className="font-headline text-4xl font-extrabold tracking-tighter text-white">
                      Alys Beach
                    </h3>
                    <p className="mt-4 font-medium text-white/90">
                      Bermudan elegance meets modern luxury.
                    </p>
                  </div>
                </Link>
                <Link
                  href="/rosemary-beach"
                  className="group relative h-[500px] cursor-pointer overflow-hidden rounded-xl md:col-span-4"
                >
                  <DesignImg
                    src={IMG.townRosemary}
                    alt="rosemary beach cobblestone street with european style architecture and hanging flower baskets"
                    className="transition duration-700 group-hover:scale-105"
                    sizes="(min-width: 768px) 33vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-black/20 transition-all duration-500 group-hover:bg-black/10" />
                  <div className="absolute inset-0 flex flex-col justify-end p-12">
                    <h3 className="font-headline text-4xl font-extrabold tracking-tighter text-white">
                      Rosemary
                    </h3>
                    <p className="mt-4 font-medium text-white/90">
                      European charm on the Gulf coast.
                    </p>
                  </div>
                </Link>
                <Link
                  href="/grayton-beach"
                  className="group relative h-[500px] cursor-pointer overflow-hidden rounded-xl md:col-span-8"
                >
                  <DesignImg
                    src={IMG.townGrayton}
                    alt="rustic wooden beach boardwalk through high dunes at grayton beach state park florida"
                    className="transition duration-700 group-hover:scale-105"
                    sizes="(min-width: 768px) 66vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-black/20 transition-all duration-500 group-hover:bg-black/10" />
                  <div className="absolute inset-0 flex flex-col justify-end p-12">
                    <h3 className="font-headline text-5xl font-extrabold tracking-tighter text-white">
                      Grayton
                    </h3>
                    <p className="mt-4 max-w-md font-medium text-white/90">
                      Nice dogs, strange people. The soulful, artsy heart of the
                      Emerald Coast.
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </section>
        )}

        {featureFlags["categories"] === true && (
          <section
            id="section-categories"
            className="mx-auto max-w-7xl px-8 py-24"
          >
          <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Curated Discovery
              </p>
              <h2 className="font-headline text-4xl font-extrabold tracking-tighter text-primary">
                Explore by Category
              </h2>
            </div>
            <Link
              href={PRIMARY_REGION_HUB_PATH}
              className="flex items-center gap-2 font-semibold text-primary transition-all hover:gap-3"
            >
              View all{" "}
              <MsIcon name="east" className="!text-sm text-primary" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/?q=beachfront+stays+30A"
              className="group cursor-pointer"
            >
              <div className="relative mb-6 aspect-[4/5] overflow-hidden rounded-xl shadow-sm transition-all duration-500 group-hover:shadow-xl">
                <DesignImg
                  src={IMG.catStays}
                  alt="Modern white architectural beach house with large glass windows reflecting the emerald coast at noon"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
              </div>
              <h3 className="mb-1 font-headline text-xl font-bold text-primary">
                Beachfront Stays
              </h3>
              <p className="text-sm text-on-surface-variant/80">
                Wake up to the sound of waves.
              </p>
            </Link>
            <Link
              href="/?q=seaside+dining+30A"
              className="group translate-y-12 cursor-pointer"
            >
              <div className="relative mb-6 aspect-[4/5] overflow-hidden rounded-xl shadow-sm transition-all duration-500 group-hover:shadow-xl">
                <DesignImg
                  src={IMG.catDining}
                  alt="Upscale outdoor restaurant terrace overlooking the gulf with string lights and elegant wooden furniture"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
              </div>
              <h3 className="mb-1 font-headline text-xl font-bold text-primary">
                Seaside Dining
              </h3>
              <p className="text-sm text-on-surface-variant/80">
                Fresh catches and coastal spirits.
              </p>
            </Link>
            <Link
              href="/?q=family+friendly+30A"
              className="group cursor-pointer"
            >
              <div className="relative mb-6 aspect-[4/5] overflow-hidden rounded-xl shadow-sm transition-all duration-500 group-hover:shadow-xl">
                <DesignImg
                  src={IMG.catFamily}
                  alt="Happy family riding bicycles along a scenic bike path lined with dunes and white picket fences"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
              </div>
              <h3 className="mb-1 font-headline text-xl font-bold text-primary">
                Family Experiences
              </h3>
              <p className="text-sm text-on-surface-variant/80">
                Create memories along the shore.
              </p>
            </Link>
            <Link
              href="/?q=town+tours+30A"
              className="group translate-y-12 cursor-pointer"
            >
              <div className="relative mb-6 aspect-[4/5] overflow-hidden rounded-xl shadow-sm transition-all duration-500 group-hover:shadow-xl">
                <DesignImg
                  src={IMG.catTours}
                  alt="Aerial view of seaside architectural style with iconic white tower and green common spaces"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
              </div>
              <h3 className="mb-1 font-headline text-xl font-bold text-primary">
                Town Tours
              </h3>
              <p className="text-sm text-on-surface-variant/80">
                Walk through coastal masterpieces.
              </p>
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
                  Plan your trip with AI
                </h2>
                <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-on-primary-container">
                  &ldquo;Find me a dog-friendly beachfront cottage in Grayton
                  Beach for a family of four, near a great seafood spot.&rdquo; Our
                  Digital Concierge understands the nuance of the coast.
                </p>
                <div className="flex flex-col justify-center gap-4 md:flex-row">
                  <button
                    type="button"
                    onClick={scrollToHero}
                    className="rounded-full bg-surface-elevated px-8 py-4 text-lg font-bold text-primary transition-all hover:shadow-xl"
                  >
                    Start Chatting
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
      </main>
    </div>
  );
}
