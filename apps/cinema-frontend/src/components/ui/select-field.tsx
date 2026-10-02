import type { SelectHTMLAttributes } from "react";

export type SelectOption = { value: string; label: string };
export type SelectFieldProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> & {
  id: string;
  label: string;
  placeholder: string;
  options: SelectOption[];
  helperText?: string;
  errorText?: string;
};

export function SelectField({
  id,
  label,
  placeholder,
  options,
  helperText,
  errorText,
  className = "",
  ...props
}: SelectFieldProps) {
  const descriptionId =
    helperText || errorText ? `${id}-description` : undefined;
  return (
    <div className={`flex min-w-0 flex-col gap-[6px] ${className}`}>
      <label htmlFor={id} className="text-[13px] font-medium text-text-primary">
        {label}
      </label>
      <select
        {...props}
        id={id}
        aria-invalid={errorText ? true : undefined}
        aria-describedby={descriptionId}
        className={`min-h-12 w-full rounded-lg border bg-surface px-[14px] text-[14px] text-text-primary focus:border-action-primary disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-tertiary ${errorText ? "border-status-error" : "border-border-subtle"}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {(errorText || helperText) && (
        <p
          id={descriptionId}
          className={`text-xs ${errorText ? "text-status-error" : "text-text-secondary"}`}
        >
          {errorText || helperText}
        </p>
      )}
    </div>
  );
}
