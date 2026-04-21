---
name: Astro import extension resolution
description: Astro follows TypeScript module resolution — .jsx/.tsx extensions can be omitted from import paths even in a Deno project
type: reference
---

Astro uses TypeScript module resolution rules for local imports, so file extensions can be omitted from import paths:

```js
import Foo from "./Foo"; // resolves to Foo.jsx / Foo.tsx automatically
```

The **Deno LSP** will flag bare imports as errors (`no-local`) because Deno itself requires explicit extensions. This is a false positive in an Astro project — Astro's resolver (Vite-backed) intercepts these imports before Deno does, so at runtime they resolve correctly.

**Source:** https://docs.astro.build/en/guides/imports/#import-statements

**How to apply:** In this project, omitting `.jsx`/`.tsx` from local import paths is fine and idiomatic. Ignore Deno LSP `no-local` errors on Astro component imports.
