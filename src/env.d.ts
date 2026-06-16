/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly DENO_TIMELINE: string | undefined;
  readonly E2E_TEST_USER_ID: string | undefined;
  readonly GOOGLE_AI_STUDIO_KEY: string | undefined;
  readonly GOOGLE_AI_STUDIO_MODEL: string | undefined;
  readonly MODE: string;
  [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    boardId: string;
    auth: () => { userId: string | null };
  }
}

declare namespace React {
  interface CSSProperties {
    // Allow any CSS variable starting with '--'
    [key: `--${string}`]: string | number;
  }
}
