type HugeiconsIconData = { body: string; width?: number; height?: number };
type HugeiconsAlias = { parent: string };

type HugeiconsJson = {
  icons: Record<string, HugeiconsIconData>;
  aliases: Record<string, HugeiconsAlias>;
  width: number;
  height: number;
};

let hugeiconsPromise: Promise<HugeiconsJson> | null = null;

function loadHugeicons(): Promise<HugeiconsJson> {
  if (!hugeiconsPromise) {
    hugeiconsPromise = import("@iconify/json/json/hugeicons.json").then(
      (mod) => mod.default as HugeiconsJson,
    );
  }
  return hugeiconsPromise;
}

export async function searchHugeicons(
  query: string,
  limit = 50,
): Promise<{ value: string }[]> {
  const { icons, aliases } = await loadHugeicons();
  const needle = query.trim().toLowerCase();
  const names = [...Object.keys(icons), ...Object.keys(aliases)];
  const matches = needle
    ? names.filter((name) => name.toLowerCase().includes(needle))
    : names;
  return matches.slice(0, limit).map((value) => ({ value }));
}

export async function getHugeiconSvg(
  name: string,
): Promise<{ body: string; width: number; height: number } | null> {
  const { icons, aliases, width, height } = await loadHugeicons();
  const resolvedName = icons[name] ? name : aliases[name]?.parent;
  const icon = resolvedName ? icons[resolvedName] : undefined;
  if (!icon) return null;
  return {
    body: icon.body,
    width: icon.width ?? width,
    height: icon.height ?? height,
  };
}
