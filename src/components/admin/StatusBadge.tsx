import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  pending_review: "bg-amber-50 text-amber-800 ring-amber-200",
  scheduled: "bg-sky-50 text-sky-800 ring-sky-200",
  rejected: "bg-red-50 text-red-800 ring-red-200",
  spam: "bg-red-50 text-red-800 ring-red-200",
  unpublished: "bg-orange-50 text-orange-800 ring-orange-200",
  archived: "bg-slate-100 text-slate-600 ring-slate-200",
  breaking: "bg-red-50 text-red-800 ring-red-200",
  high: "bg-orange-50 text-orange-800 ring-orange-200",
  normal: "bg-slate-100 text-slate-700 ring-slate-200",
  low: "bg-slate-50 text-slate-500 ring-slate-200",
  completed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  failed: "bg-red-50 text-red-800 ring-red-200",
  running: "bg-sky-50 text-sky-800 ring-sky-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  error: "bg-red-50 text-red-800 ring-red-200",
  info: "bg-sky-50 text-sky-800 ring-sky-200",
};

type StatusBadgeProps = {
  status?: string | null;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) return null;
  const key = status.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE[key] || "bg-slate-100 text-slate-700 ring-slate-200",
        className,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
