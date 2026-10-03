import type { ButtonHTMLAttributes } from "react";

export type FilterChipProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  label: string;
  pressed: boolean;
};

export function FilterChip({
  label,
  pressed,
  className = "",
  ...props
}: FilterChipProps) {
  return (
    <button
      {...props}
      type="button"
      aria-pressed={pressed}
      className={`inline-flex min-h-9 items-center justify-center rounded-full border px-3 py-2 text-[12px] font-medium leading-4 transition-colors focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-action-primary active:translate-y-px disabled:cursor-not-allowed disabled:opacity-42 ${pressed ? "border-action-primary bg-action-soft text-text-primary" : "border-border-subtle bg-surface-subtle text-text-secondary hover:border-border-strong"} ${className}`}
    >
      {label}
    </button>
  );
}
