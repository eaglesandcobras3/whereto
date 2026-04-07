"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { nanoid } from "nanoid";
import { SaveButton } from "@/components/discovery/SaveButton";
import { TagPills } from "@/components/discovery/TagPills";
import { ListingThumbnail } from "@/components/discovery/ListingThumbnail";
import { PRIMARY_REGION_HUB_PATH } from "@/lib/routes/primary-region";

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
    google_rating?: number | null;
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

const MOOD_CHIPS = [
  { label: "Relaxed" as const, hint: "relaxed day on 30A" },
  { label: "Active" as const, hint: "active outdoor things to do on 30A" },
  { label: "Family" as const, hint: "family-friendly activities on 30A" },
  { label: "Romantic" as const, hint: "romantic dinner sunset views 30A" },
] as const;

type Mood = (typeof MOOD_CHIPS)[number]["label"];

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

export function HomePage() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchJson | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [activeMood, setActiveMood] = useState<Mood | null>("Relaxed");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const runSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) return;
      setLoading(true);
      setErr(null);
      setShareMsg(null);
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const j = (await res.json()) as SearchJson & { error?: string };
        if (!res.ok) throw new Error(j.error ?? "Search failed");
        setData(j);
        void logImpressions(j);
      } catch (e) {
        setData(null);
        setErr(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    },
    [logImpressions],
  );

  useEffect(() => {
    const initial = searchParams.get("q");
    if (initial?.trim()) {
      setQ(initial);
      void runSearch(initial);
    }
  }, [searchParams, runSearch]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runSearch(q);
  }

  function onChangeInput(v: string) {
    setQ(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (v.trim().length >= 4) void runSearch(v);
    }, 400);
  }

  async function shareResult() {
    if (!data?.cache_id) return;
    const res = await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cache_id: data.cache_id }),
    });
    const j = (await res.json()) as { url?: string; error?: string };
    if (!res.ok) {
      setShareMsg(j.error ?? "Could not create share");
      return;
    }
    const full = `${window.location.origin}${j.url}`;
    await navigator.clipboard.writeText(full);
    setShareMsg(`Link copied: ${full}`);
    void fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: data.recommendations[0]?.business_id,
        interaction_type: "share",
        query_hash: data.query_hash,
        session_id: sessionKey(),
      }),
    });
  }

  async function saveBusiness(id: string) {
    const res = await fetch("/api/saves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: id }),
    });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      const j = await res.json();
      alert(j.error ?? "Save failed");
    }
  }

  function logClick(
    businessId: string,
    kind: "directions" | "website",
    queryHash: string | undefined,
  ) {
    void fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: businessId,
        interaction_type: "click",
        query_hash: queryHash ?? null,
        session_id: sessionKey(),
        metadata: { kind },
      }),
    });
  }

  async function sendFeedback(
    businessId: string,
    type: string,
    reason?: string,
  ) {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: businessId,
        feedback_type: type,
        feedback_reason: reason ?? null,
        query_context: data?.query ?? null,
        session_id: sessionKey(),
      }),
    });
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
            <Link
              href="/#section-neighborhoods"
              className="text-outline transition-all duration-300 ease-in-out hover:text-brand-wordmark hover:opacity-80"
            >
              Towns
            </Link>
            <Link
              href="/#section-categories"
              className="text-outline transition-all duration-300 ease-in-out hover:text-brand-wordmark hover:opacity-80"
            >
              Eat & Drink
            </Link>
            <Link
              href="/#section-curator"
              className="text-outline transition-all duration-300 ease-in-out hover:text-brand-wordmark hover:opacity-80"
            >
              Experiences
            </Link>
          </div>
          <div className="flex items-center space-x-4 md:space-x-6">
            <Link
              href="/login"
              className="material-symbols-outlined text-outline transition-all hover:text-brand-wordmark"
              aria-label="Account"
            >
              person
            </Link>
            <button
              type="button"
              onClick={scrollToHero}
              className="scale-95 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-all hover:opacity-90 active:duration-100 md:px-8"
            >
              Plan Trip
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-20">
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
              className="group relative mx-auto w-full max-w-[800px] px-4"
            >
              <input
                ref={heroInputRef}
                name="q"
                value={q}
                onChange={(e) => onChangeInput(e.target.value)}
                className="h-16 w-full rounded-full border-none bg-surface-container-highest px-8 text-lg text-on-surface shadow-sm transition-all placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/10"
                placeholder="e.g. A dinner with sunset views in Alys Beach"
                type="search"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute bottom-2 right-2 top-2 flex aspect-square items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-container disabled:opacity-60"
                aria-label="Search"
              >
                <MsIcon name="arrow_forward" className="!text-xl" />
              </button>
            </form>
            <div
              className="mt-10 flex flex-wrap justify-center gap-3 px-4"
              role="group"
              aria-label="Trip mood"
            >
              {MOOD_CHIPS.map(({ label, hint }) => {
                const on = activeMood === label;
                return (
                  <button
                    key={label}
                    type="button"
                    data-mood={label.toLowerCase()}
                    onClick={() => {
                      setActiveMood(label);
                      setQ(hint);
                    }}
                    className={
                      on
                        ? "rounded-full bg-primary px-6 py-2 text-sm font-medium text-on-primary transition-all"
                        : "rounded-full bg-surface-container-low px-6 py-2 text-sm font-medium text-on-surface-variant transition-all hover:bg-surface-container-high"
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {err ? (
          <div className="mx-auto max-w-screen-xl px-6 py-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {err}
            </div>
          </div>
        ) : null}

        {data ? (
          <section
            id="section-search-results"
            className="border-b border-surface-container-highest bg-surface-elevated py-16"
          >
            <div className="mx-auto max-w-screen-xl px-6">
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-headline text-3xl font-extrabold text-primary">
                    Results
                  </h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {data.summary}
                  </p>
                </div>
                {data.cache_id ? (
                  <button
                    type="button"
                    onClick={() => void shareResult()}
                    className="inline-flex items-center gap-2 rounded-full border border-outline-variant/40 bg-background px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-high"
                  >
                    Share
                  </button>
                ) : null}
              </div>
              {shareMsg ? (
                <p className="mb-4 text-xs text-outline">{shareMsg}</p>
              ) : null}
              {data.cached ? (
                <p className="mb-4 text-xs text-outline">Served from cache</p>
              ) : null}
              <ul className="grid gap-6 sm:grid-cols-2">
                {data.recommendations.map((r) => {
                  const b = r.business;
                  const m = b.lat != null && b.lng != null;
                  return (
                    <li
                      key={r.business_id}
                      className="overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-elevated shadow-design-card"
                    >
                      {b.slug ? (
                        <Link
                          href={`/business/${b.slug}`}
                          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <ListingThumbnail
                            slug={b.slug}
                            imageUrl={b.image_url}
                            className="aspect-[5/4] min-h-[160px] rounded-none"
                            rounded="none"
                          />
                        </Link>
                      ) : (
                        <ListingThumbnail
                          slug={r.business_id}
                          imageUrl={b.image_url}
                          className="aspect-[5/4] min-h-[160px] rounded-none"
                          rounded="none"
                        />
                      )}
                      <div className="space-y-3 p-5 pt-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {b.slug ? (
                              <Link
                                href={`/business/${b.slug}`}
                                className="text-lg font-semibold text-on-surface transition-colors hover:text-primary"
                              >
                                {b.name ?? "Business"}
                              </Link>
                            ) : (
                              <p className="text-lg font-semibold text-on-surface">
                                {b.name ?? "Business"}
                              </p>
                            )}
                            <p className="text-sm font-medium text-primary">
                              {r.headline}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <SaveButton
                              businessId={r.business_id}
                              onSave={saveBusiness}
                              size="sm"
                            />
                            <details className="relative">
                              <summary className="cursor-pointer list-none rounded-lg border border-outline-variant/40 bg-surface-elevated p-2 text-on-surface-variant hover:bg-surface-container-low">
                                <MsIcon name="more_vert" className="!text-lg" />
                              </summary>
                              <div className="absolute right-0 z-10 mt-1 w-52 rounded-xl border border-outline-variant/40 bg-surface-elevated py-1 shadow-lg">
                                {m ? (
                                  <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block px-4 py-2 text-sm hover:bg-surface-container-low"
                                    onClick={() =>
                                      logClick(
                                        r.business_id,
                                        "directions",
                                        data?.query_hash,
                                      )
                                    }
                                  >
                                    Directions
                                  </a>
                                ) : null}
                                {b.website ? (
                                  <a
                                    href={b.website}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block px-4 py-2 text-sm hover:bg-surface-container-low"
                                    onClick={() =>
                                      logClick(
                                        r.business_id,
                                        "website",
                                        data?.query_hash,
                                      )
                                    }
                                  >
                                    Website
                                  </a>
                                ) : null}
                                <button
                                  type="button"
                                  className="block w-full px-4 py-2 text-left text-sm hover:bg-surface-container-low"
                                  onClick={() =>
                                    void sendFeedback(
                                      r.business_id,
                                      "not_relevant",
                                    )
                                  }
                                >
                                  Not a good fit
                                </button>
                                <button
                                  type="button"
                                  className="block w-full px-4 py-2 text-left text-sm hover:bg-surface-container-low"
                                  onClick={() =>
                                    void sendFeedback(
                                      r.business_id,
                                      "had_bad_experience",
                                      "poor_service",
                                    )
                                  }
                                >
                                  Bad experience
                                </button>
                                <button
                                  type="button"
                                  className="block w-full px-4 py-2 text-left text-sm hover:bg-surface-container-low"
                                  onClick={() =>
                                    void sendFeedback(
                                      r.business_id,
                                      "hide_for_me",
                                    )
                                  }
                                >
                                  Don&apos;t show again
                                </button>
                              </div>
                            </details>
                          </div>
                        </div>
                        <p className="line-clamp-2 text-sm text-on-surface-variant">
                          {r.explanation}
                        </p>
                        <TagPills
                          tags={[
                            ...(r.highlighted_tags ?? []),
                            ...(b.tags ?? []),
                          ].slice(0, 6)}
                          colored
                        />
                        {b.slug ? (
                          <p>
                            <Link
                              href={`/business/${b.slug}`}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              View details
                            </Link>
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ) : null}

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
      </main>

      <footer className="mt-20 w-full rounded-t-[2rem] bg-surface-container-low">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-8 py-16 md:grid-cols-4 md:px-12">
          <div className="md:col-span-1">
            <div className="mb-6 font-headline text-xl font-black text-primary">
              WhereTo30A
            </div>
            <p className="mb-8 text-sm leading-relaxed text-on-surface-variant/80">
              The Digital Concierge for the Emerald Coast. Experience 30A like a
              local with curated stays and insider insights.
            </p>
            <div className="flex gap-4 text-primary">
              <button
                type="button"
                data-footer-action="share"
                className="material-symbols-outlined cursor-pointer bg-transparent"
                aria-label="Share"
              >
                share
              </button>
              <button
                type="button"
                data-footer-action="mail"
                className="material-symbols-outlined cursor-pointer bg-transparent"
                aria-label="Email"
              >
                mail
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-headline text-xs font-semibold uppercase tracking-widest text-teal-950">
              The Towns
            </h4>
            <nav className="flex flex-col gap-3">
              <Link
                href="/seaside"
                className="text-sm text-teal-800/70 decoration-teal-500/30 underline-offset-4 hover:underline"
              >
                Seaside
              </Link>
              <Link
                href="/rosemary-beach"
                className="text-sm text-teal-800/70 decoration-teal-500/30 underline-offset-4 hover:underline"
              >
                Rosemary Beach
              </Link>
              <Link
                href="/alys-beach"
                className="text-sm text-teal-800/70 decoration-teal-500/30 underline-offset-4 hover:underline"
              >
                Alys Beach
              </Link>
              <Link
                href="/grayton-beach"
                className="text-sm text-teal-800/70 decoration-teal-500/30 underline-offset-4 hover:underline"
              >
                Grayton Beach
              </Link>
            </nav>
          </div>
          <div className="space-y-4">
            <h4 className="font-headline text-xs font-semibold uppercase tracking-widest text-teal-950">
              Resources
            </h4>
            <nav className="flex flex-col gap-3">
              <a
                href="#"
                data-footer-link="company"
                className="text-sm text-teal-800/70 decoration-teal-500/30 underline-offset-4 hover:underline"
              >
                Company Info
              </a>
              <a
                href="#"
                data-footer-link="insider"
                className="text-sm text-teal-800/70 decoration-teal-500/30 underline-offset-4 hover:underline"
              >
                Coastal Insider
              </a>
              <a
                href="#"
                data-footer-link="partners"
                className="text-sm text-teal-800/70 decoration-teal-500/30 underline-offset-4 hover:underline"
              >
                Partner with Us
              </a>
              <a
                href="#"
                data-footer-link="privacy"
                className="text-sm text-teal-800/70 decoration-teal-500/30 underline-offset-4 hover:underline"
              >
                Privacy Policy
              </a>
            </nav>
          </div>
          <div className="space-y-4">
            <h4 className="font-headline text-xs font-semibold uppercase tracking-widest text-teal-950">
              Newsletter
            </h4>
            <p className="text-sm text-teal-800/70">
              Join 15,000+ coastal enthusiasts.
            </p>
            <form
              className="flex rounded-full border border-teal-100 bg-white p-1"
              onSubmit={(e) => {
                e.preventDefault();
              }}
              action="#"
            >
              <input
                name="email"
                className="flex-1 border-none bg-transparent px-4 text-sm text-on-surface focus:ring-0"
                placeholder="Your email"
                type="email"
                autoComplete="email"
              />
              <button
                type="submit"
                className="rounded-full bg-primary p-2 text-on-primary"
                aria-label="Subscribe"
              >
                <MsIcon name="arrow_forward" className="!text-sm" />
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-primary/5 px-8 py-8 text-xs font-medium text-outline/50 md:flex-row md:px-12">
          <p>
            © 2024 WhereTo30A. The Digital Concierge for the Emerald Coast.
          </p>
          <div className="flex gap-6">
            <a href="https://instagram.com" className="hover:underline">
              Instagram
            </a>
            <a href="https://tiktok.com" className="hover:underline">
              TikTok
            </a>
            <a href="https://facebook.com" className="hover:underline">
              Facebook
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
