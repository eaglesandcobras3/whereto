const SECTION_ICON_RULES: { pattern: RegExp; icon: string }[] = [
  { pattern: /beach|shore|sand|surf|water/i, icon: "beach_access" },
  { pattern: /eat|food|restaurant|dining|coffee|cafe|bar|drink/i, icon: "restaurant" },
  { pattern: /shop|store|retail|boutique|market/i, icon: "storefront" },
  { pattern: /park|trail|hike|outdoor|nature|golf/i, icon: "park" },
  { pattern: /stay|hotel|rental|lodging|sleep/i, icon: "bed" },
  { pattern: /park|drive|car|bike|walk|getting around|transport/i, icon: "directions_car" },
  { pattern: /kid|family|child/i, icon: "family_restroom" },
  { pattern: /event|festival|season|calendar/i, icon: "event" },
  { pattern: /tip|know|plan|overview|intro|about/i, icon: "lightbulb" },
  { pattern: /history|story|background/i, icon: "menu_book" },
  { pattern: /vibe|feel|atmosphere/i, icon: "spa" },
  { pattern: /who|great for|skip if|fit/i, icon: "groups" },
];

export function sectionIconForTitle(title: string): string {
  for (const rule of SECTION_ICON_RULES) {
    if (rule.pattern.test(title)) return rule.icon;
  }
  return "explore";
}

export function markdownSectionPreview(body: string, maxLength = 150): string {
  const text = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#+\s+.*/gm, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[*_`>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}
