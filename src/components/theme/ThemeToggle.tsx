import { useEffect, useState } from "react";

import {
  applyTheme,
  getPreferredTheme,
  NIGHT_THEME,
  toggleTheme,
} from "./theme.ts";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => getPreferredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <label id="theme-controller" className="swap swap-rotate cursor-pointer">
      <input
        type="checkbox"
        checked={theme === NIGHT_THEME}
        onChange={() => setTheme(toggleTheme(theme))}
      />

      <span className="iconify swap-on hugeicons--moon-02 text-xl" />
      <span className="iconify swap-off hugeicons--sun-03 text-xl" />
    </label>
  );
}
