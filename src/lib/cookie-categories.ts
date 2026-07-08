import type { Category } from "@policystack/core/consent";

// Consent categories shown in the banner + preferences modal. Only Analytics is
// optional here — Essential is locked (sign-in, board, and the consent record
// itself). No Marketing category: the site has no ad/marketing pixels, so the
// advertising Consent Mode signals stay denied (see GoogleAnalytics.astro).
export const categories: Category[] = [
  {
    key: "essential",
    label: "Essential",
    locked: true,
    description: "Required for the site to work.",
  },
  {
    key: "analytics",
    label: "Analytics",
    description: "Helps us understand how the site is used.",
  },
];
