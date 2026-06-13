/// <reference path="../.astro/types.d.ts" />

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
