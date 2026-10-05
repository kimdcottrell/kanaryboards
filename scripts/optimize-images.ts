// Writes WebP copies of the images HtmlHead.astro references by URL.
// getImage() would route them through /_image, which needs Sharp at runtime,
// and the Deno Deploy binary doesn't ship Sharp. Re-run after changing a source.
import sharp from "sharp";

const SOURCES = ["site-default.png", "kanby.jpg"];

await Deno.mkdir("public/images", { recursive: true });

for (const name of SOURCES) {
  const out = `public/images/${name.replace(/\.\w+$/, ".webp")}`;
  const info = await sharp(`src/images/${name}`).webp({ quality: 80 }).toFile(
    out,
  );
  console.log(out, `${info.width}x${info.height}`, `${info.size}B`);
}
