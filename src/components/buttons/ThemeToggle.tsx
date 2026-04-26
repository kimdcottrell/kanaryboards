import { useEffect, useState } from "preact/hooks";

export default function ThemeController() {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("theme") ??
      (globalThis.matchMedia("(prefers-color-scheme: dark)").matches
        ? "kanary-night"
        : "kanary-day")
  );
  const toggleTheme = () => {
    setTheme(theme === "kanary-night" ? "kanary-day" : "kanary-night");
  };
  useEffect(() => {
    const html = document.querySelector("html");
    if (!html) return;
    html.setAttribute("data-theme", theme);
    html.classList.toggle("latte", theme === "kanary-day");
    html.classList.toggle("mocha", theme === "kanary-night");
    localStorage.setItem("theme", theme);
  }, [theme]);
  return (
    <label className="swap swap-rotate">
      <input onClick={toggleTheme} type="checkbox" />
      <label class="swap swap-rotate cursor-pointer">
        <input
          type="checkbox"
          id="theme-controller"
          onClick={toggleTheme}
        />
        <span class="iconify swap-on hugeicons--sun-03 text-xl"></span>
        <span class="iconify swap-off hugeicons--moon-02 text-xl"></span>
      </label>
    </label>
  );
}
