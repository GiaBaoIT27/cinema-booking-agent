import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        <input
          ref={ref}
          className={`
            h-11 w-full rounded-lg border bg-[#0B0F19] px-3 text-[15px] text-white outline-none transition
            placeholder:text-[14px] placeholder:text-[#4B5563]
            hover:border-[#374151] focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/30
            ${error ? "border-red-500 focus:border-red-500" : "border-[#1F2937]"}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-[12px] text-red-500">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
