// @vitest-environment node
import { createTestContainer } from "./setup.ts";
import { expect, test } from "vitest";
import IndexPage from "@pages/index.astro";
import GoogleAnalytics from "@components/seo/GoogleAnalytics.astro";

test("GoogleAnalytics renders with the required tag prop", async () => {
    const container = await createTestContainer();
    const testTag = "GT-TEST123";

    const result = await container.renderToString(GoogleAnalytics, {
        props: { tag: testTag },
    });

    expect(result).toContain(`https://www.googletagmanager.com/gtag/js?id=${testTag}`);
    expect(result).toContain(`gtag("config", "${testTag}")`);
});

test("BoardWrapper is rendered with react as the client framework", async () => {
    const container = await createTestContainer();

    const result = await container.renderToString(IndexPage, {});

    expect(result).toContain(`client="only"`);
    expect(result).toContain(`BoardWrapper`);
});
