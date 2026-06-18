/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    dir: "tests/vitest",
    environment: "jsdom",
    globals: true,
    reporters: ["default", "github-actions"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
