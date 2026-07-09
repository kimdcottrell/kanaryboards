/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly DENO_TIMELINE: string | undefined;
  readonly E2E_TEST_USER_ID: string | undefined;
  readonly GOOGLE_AI_STUDIO_KEY: string | undefined;
  readonly GOOGLE_AI_STUDIO_MODEL: string | undefined;
  readonly MODE: string;
  readonly RESEND_API_KEY: string | undefined;
  [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    boardId: string | undefined;
    auth: () => { userId: string | null };
    timestamp?: string;
    status?: number;
    statusText?: string;
  }
}

declare namespace React {
  interface CSSProperties {
    // Allow any CSS variable starting with '--'
    [key: `--${string}`]: string | number;
  }
}
