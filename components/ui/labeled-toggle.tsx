"use client";

interface LabeledToggleProps {
  leftLabel: string;
  rightLabel: string;
  isRight: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
}

export function LabeledToggle({
  leftLabel,
  rightLabel,
  isRight,
  onToggle,
  size = "md",
}: LabeledToggleProps) {
  const trackWidth = size === "sm" ? "w-11" : "w-14";
  const trackHeight = size === "sm" ? "h-6" : "h-7";
  const thumbSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const thumbTranslate = size === "sm" ? "translate-x-5" : "translate-x-7";
  const labelSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="flex items-center gap-3">
      {/* Left Label */}
      <span
        className={`${labelSize} font-medium transition-colors duration-200 ${
          !isRight
            ? "text-[var(--text-primary)]"
            : "text-[var(--text-muted)]"
        }`}
      >
        {leftLabel}
      </span>

      {/* Toggle Track */}
      <button
        type="button"
        role="switch"
        aria-checked={isRight}
        onClick={onToggle}
        className={`
          relative ${trackWidth} ${trackHeight} rounded-full
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:ring-offset-2 focus:ring-offset-transparent
          ${isRight
            ? "bg-gradient-to-r from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/25"
            : "bg-[var(--glass-bg)] border border-[var(--glass-border)]"
          }
        `}
      >
        {/* Thumb */}
        <span
          className={`
            absolute top-1 left-1 ${thumbSize} rounded-full
            transition-transform duration-300 ease-out
            ${isRight
              ? `${thumbTranslate} bg-white shadow-md`
              : "translate-x-0 bg-[var(--text-muted)]"
            }
          `}
        />
      </button>

      {/* Right Label */}
      <span
        className={`${labelSize} font-medium transition-colors duration-200 ${
          isRight
            ? "text-[var(--text-primary)]"
            : "text-[var(--text-muted)]"
        }`}
      >
        {rightLabel}
      </span>
    </div>
  );
}

