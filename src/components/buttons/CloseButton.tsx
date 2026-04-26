import type { JSX } from "preact";

interface CloseButtonProps {
  onClick: JSX.MouseEventHandler<HTMLButtonElement>;
  tooltip?: string;
  tooltipPosition?: "top" | "bottom" | "left" | "right";
  class?: string;
  "aria-label"?: string;
}

export default function CloseButton({
  onClick,
  tooltip,
  tooltipPosition,
  class: extraClass,
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
      class={cls}
      onClick={onClick}
      data-tip={tooltip}
      aria-label={ariaLabel ?? tooltip}
    >
      <span class="iconify hugeicons--cancel-01 text-xl"></span>
    </button>
  );
}
