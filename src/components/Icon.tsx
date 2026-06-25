import { useEffect, useState } from "react";
import { getHugeiconSvg } from "@lib/icons.ts";

type IconSvg = { body: string; width: number; height: number };

export default function Icon(
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
