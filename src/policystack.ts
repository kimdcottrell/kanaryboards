import {
  Contractual,
  DataCategories,
  defineConfig,
  LegalBases,
  Providers,
  Voluntary,
} from "@policystack/sdk";

export default defineConfig({
  company: {
    name: "Kanby",
    legalName: "Kanby LLC",
    address: "8401 Mayland Dr, Ste A, Richmond, VA 23294",
    url: "https://kanby.ai",
    contact: { email: "privacy@kanby.ai", phone: "(571) 336-2406" },
  },

  effectiveDate: "2026-07-06",

  // Opt-out posture, US-only text; add "eea"/"uk" if the user base expands there.
  jurisdictions: ["us", "us-ca"],

  data: {
    collected: {
      "Account Information": [
        ...DataCategories.AccountInfo["Account Information"],
      ],
      "Usage Data": [...DataCategories.UsageData["Usage Data"]],
      "Board Content": [
        "Board titles",
        "Row and column titles",
        "Task titles",
        "Task descriptions",
        "Checklist items",
      ],
    },
    context: {
      "Account Information": {
        purpose: "Create and manage your account, and authenticate sign-in",
        lawfulBasis: LegalBases.Contract,
        retention: "Until account deletion",
        provision: Contractual(
          "You cannot create an account or sign in without it.",
        ),
      },
      "Usage Data": {
        purpose: "Understand how the site is used so we can improve it",
        lawfulBasis: LegalBases.Consent,
        retention: "1 year",
        provision: Voluntary(
          "Analytics cookies are optional; declining does not affect service access.",
        ),
      },
      "Board Content": {
        purpose:
          "The dashboard application that allows you to manage your projects.",
        lawfulBasis: LegalBases.Contract,
        retention: "Until account deletion",
        provision: Contractual(
          "You cannot create or use boards, rows, columns, or tasks without it.",
        ),
      },
    },
  },

  // Mirrors src/lib/cookie-categories.ts: essential is always on, analytics is
  // the only consent-gated category (no marketing/ad pixels on this site).
  cookies: {
    used: { essential: true, analytics: true },
    context: {
      essential: { lawfulBasis: LegalBases.Contract },
      analytics: { lawfulBasis: LegalBases.Consent },
    },
  },

  thirdParties: [
    Providers.Clerk,
    Providers.GoogleAnalytics,
    {
      name: "Google (Gemini API)",
      purpose: "Powers AI-generated checklist suggestions",
      policyUrl: "https://policies.google.com/privacy",
    },
  ],
});
