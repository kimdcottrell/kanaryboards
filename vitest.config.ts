import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    dir: 'tests/vitest',
    environment: 'jsdom',
    globals: true,
    coverage: {
        provider: "v8",
        reporter: ["text", "html"]
    },
  },
});