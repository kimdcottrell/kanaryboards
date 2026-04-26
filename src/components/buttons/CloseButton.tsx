import type { MouseEventHandler } from "react";

interface CloseButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
  tooltip?: string;
  tooltipPosition?: "top" | "bottom" | "left" | "right";
  className?: string;
  "aria-label"?: string;
}

export default function CloseButton({
  onClick,
  tooltip,
  tooltipPosition,
  className: extraClass,
  "aria-label": ariaLabel,
}: CloseButtonProps) {
  const tooltipClasses = tooltip
    ? `tooltip${tooltipPosition ? ` tooltip-${tooltipPosition}` : ""}`
    : "";
  const cls = [tooltipClasses, "btn btn-error btn-sm btn-square", extraClass]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      data-tip={tooltip}
      aria-label={ariaLabel ?? tooltip}
    >
      <span className="iconify hugeicons--cancel-01 text-xl"></span>
    </button>
  );
}
