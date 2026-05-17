export const DAY_THEME = "kanary-day";
export const NIGHT_THEME = "kanary-night";

export function getPreferredTheme() {
  if (typeof window === "undefined") return DAY_THEME;

  const saved = localStorage.getItem("theme");

  if (saved) return saved;

  return matchMedia("(prefers-color-scheme: dark)").matches
    ? NIGHT_THEME
    : DAY_THEME;
}

export function applyTheme(theme: string) {
  const html = document.documentElement;

  html.setAttribute("data-theme", theme);

  html.classList.toggle("latte", theme === DAY_THEME);
  html.classList.toggle("mocha", theme === NIGHT_THEME);

  localStorage.setItem("theme", theme);
}

export function toggleTheme(current: string) {
  return current === NIGHT_THEME ? DAY_THEME : NIGHT_THEME;
}
