import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

type BaseProps = {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  labelClassName?: string;
  urdu?: boolean;
};

export function FormField({
  label,
  hint,
  error,
  className,
  labelClassName,
  urdu,
  children,
}: BaseProps & { children: ReactNode }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span
        className={cn(
          "block text-sm font-medium text-slate-700",
          urdu && "font-urdu text-right",
          labelClassName,
        )}
        dir={urdu ? "rtl" : undefined}
      >
        {label}
      </span>
      {children}
      {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
      {error ? <span className="block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

const controlClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#0B7A3B] focus:ring-2 focus:ring-[#0B7A3B]/30 disabled:bg-slate-50";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement> & { urdu?: boolean }) {
  const { className, urdu, ...rest } = props;
  return (
    <input
      {...rest}
      dir={urdu ? "rtl" : rest.dir}
      className={cn(controlClass, urdu && "font-urdu text-right", className)}
    />
  );
}

export function TextTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { urdu?: boolean }) {
  const { className, urdu, ...rest } = props;
  return (
    <textarea
      {...rest}
      dir={urdu ? "rtl" : rest.dir}
      className={cn(controlClass, "min-h-[120px] resize-y", urdu && "font-urdu text-right", className)}
    />
  );
}

export function TextSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select {...rest} className={cn(controlClass, className)}>
      {children}
    </select>
  );
}
