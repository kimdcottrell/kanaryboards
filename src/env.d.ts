/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    auth: () => { userId: string | null };
    boardId?: string;
    status?: number;
    statusText?: string;
    timestamp?: string;
  }
}

declare namespace React {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}
