/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    boardId: string;
    auth: () => { userId: string | null };
  }
}
