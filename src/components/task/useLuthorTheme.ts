import { useEffect, useState } from "react";
import type { CoreTheme } from "@lyfie/luthor";

export function useLuthorTheme(): CoreTheme {
  const [theme, setTheme] = useState((): CoreTheme =>
    document.documentElement.getAttribute("data-theme") === "kanary-night"
      ? "dark"
      : "light"
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(
        document.documentElement.getAttribute("data-theme") === "kanary-night"
          ? "dark"
          : "light",
      );
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return theme;
}
