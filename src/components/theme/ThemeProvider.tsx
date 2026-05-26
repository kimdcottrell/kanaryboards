import { useEffect } from "react";

import { applyTheme, getPreferredTheme } from "./theme.ts";

export const themeInitScript = `
(function () {
  const DAY_THEME = "kanary-day";
  const NIGHT_THEME = "kanary-night";

  const saved = localStorage.getItem("theme");

  const theme =
    saved ??
    (matchMedia("(prefers-color-scheme: dark)").matches
      ? NIGHT_THEME
      : DAY_THEME);

  const html = document.documentElement;

  html.setAttribute("data-theme", theme);

  html.classList.toggle("latte", theme === DAY_THEME);
  html.classList.toggle("mocha", theme === NIGHT_THEME);
})();
`;

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    applyTheme(getPreferredTheme());
  }, []);

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: themeInitScript,
        }}
      />

      {children}
    </>
  );
}
