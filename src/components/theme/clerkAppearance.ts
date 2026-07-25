import { dark } from "@clerk/ui/themes";

import { NIGHT_THEME } from "./theme.ts";

export function getClerkAppearance(theme: string) {
  return theme === NIGHT_THEME ? { theme: dark } : undefined;
}

export function getClerkAppearanceForCurrentTheme() {
  return getClerkAppearance(
    document.documentElement.getAttribute("data-theme") ?? "",
  );
}
