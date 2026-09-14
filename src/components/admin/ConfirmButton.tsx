"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

type ConfirmButtonProps = {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  className?: string;
  variant?: "danger" | "primary" | "ghost";
  disabled?: boolean;
};

const VARIANTS = {
  danger: "bg-red-600 text-white hover:bg-red-700",
  primary: "bg-[#0B7A3B] text-white hover:bg-[#096b33]",
  ghost: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
};

export function ConfirmButton({
  label,
  confirmLabel = "Confirm?",
  onConfirm,
  className,
  variant = "danger",
  disabled,
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setArmed(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onBlur={() => setArmed(false)}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
    >
      {busy ? "Working…" : armed ? confirmLabel : label}
    </button>
  );
}
