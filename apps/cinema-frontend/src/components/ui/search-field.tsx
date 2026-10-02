import Image from "next/image";
import type { InputHTMLAttributes } from "react";

export type SearchFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  id: string;
  label: string;
  theme: "light" | "dark";
};

export function SearchField({
  id,
  label,
  theme,
  className = "",
  ...props
}: SearchFieldProps) {
  return (
    <div
      className={`flex min-h-11 min-w-0 items-center gap-[10px] rounded-control border border-border-subtle bg-surface px-[14px] py-3 focus-within:border-action-primary ${className}`}
    >
      <Image
        src={
          theme === "dark"
            ? "/icons/magnifier-dark.svg"
            : "/icons/magnifier-light.svg"
        }
        alt=""
        aria-hidden="true"
        width={18}
        height={18}
      />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        {...props}
        id={id}
        type="search"
        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] leading-5 text-text-primary placeholder:text-text-secondary"
      />
    </div>
  );
}
