import { getContainerRenderer as reactRenderer } from "@astrojs/react";
import { experimental_AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";

/**
 * Creates a test container for Astro components.
 * The React renderer is required even for client:only components — Astro resolves
 * the renderer by file extension at the client:only boundary, so without it the
 * container throws a NoMatchingRenderer error at render time.
 */
export async function createTestContainer() {
    const renderers = await loadRenderers([reactRenderer()]);
    return await experimental_AstroContainer.create({ renderers });
}
