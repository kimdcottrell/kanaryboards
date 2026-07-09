import { useEffect, useState } from "react";
import { getHugeiconSvg } from "@lib/dashboard/icons.ts";

type IconSvg = { body: string; width: number; height: number };

// `@iconify/tailwind4` runs in static/preparsed mode (see src/styles/global.css),
// so it only generates CSS for icon names it finds as literal text in source.
// This component exists for icon names only known at runtime (live search
// results, user-selected stored icon names) that can't use the
// `<span className="iconify hugeicons--...">` convention used elsewhere.
export default function DynamicIcon(
  { name, className }: { name: string; className?: string },
) {
  const [svg, setSvg] = useState<IconSvg | null>(null);

  useEffect(() => {
    setSvg(null);
    getHugeiconSvg(name).then(setSvg);
  }, [name]);

  if (!svg) return null;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${svg.width} ${svg.height}`}
      dangerouslySetInnerHTML={{ __html: svg.body }}
    />
  );
}
