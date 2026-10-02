import type { ComponentPropsWithRef } from "react";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "secondary" | "tertiary";
};

const variants = {
  primary: "border-transparent bg-action-primary text-action-on-primary hover:bg-action-primary-hover",
  secondary: "border-signature-brown bg-signature-brown-soft text-text-primary hover:bg-signature-brown-hover hover:text-signature-on-brown",
  tertiary: "border-border-subtle bg-surface text-text-primary hover:bg-surface-subtle",
} as const;

export function Button({ variant = "primary", type = "button", className = "", ...props }: ButtonProps) {
  return <button
    {...props}
    type={type}
    className={`inline-flex min-h-11 items-center justify-center rounded-control border px-[18px] py-3 text-button-label transition-colors focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-action-primary active:translate-y-px disabled:cursor-not-allowed disabled:opacity-42 disabled:active:translate-y-0 ${variants[variant]} ${className}`}
  />;
}
