import { NextResponse } from "next/server";
import { AuthError } from "./auth";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ success: false, error: message, details }, { status });
}

export async function handleApi<T>(fn: () => Promise<T>) {
  try {
    const data = await fn();
    if (data instanceof NextResponse) return data;
    return ok(data);
  } catch (err) {
    if (err instanceof AuthError) return fail(err.message, err.status);
    if (err instanceof ZodError) {
      return fail("Validation failed", 422, err.flatten());
    }
    console.error(err);
    const message =
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err instanceof Error
          ? err.message
          : "Unknown error";
    return fail(message, 500);
  }
}

export function getPagination(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 20)));
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
}
