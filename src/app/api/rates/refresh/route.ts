import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { AuthError } from "@/lib/auth";
import {
  ensureRatesRefreshJob,
  nextRatesRefreshAt,
  syncLiveRatesToDb,
} from "@/lib/fetch-live-rates";
import { ratesToPublicItems } from "@/lib/market-rates";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron / server refresh endpoint.
 * Auth: Authorization Bearer CRON_SECRET, or ?secret=CRON_SECRET
 * Vercel Cron sends Authorization: Bearer <CRON_SECRET> when CRON_SECRET is set.
 */
export async function GET(req: NextRequest) {
  return refresh(req);
}

export async function POST(req: NextRequest) {
  return refresh(req);
}

async function refresh(req: NextRequest) {
  return handleApi(async () => {
    const secret = process.env.CRON_SECRET?.trim();
    const auth = req.headers.get("authorization") || "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    const url = new URL(req.url);
    const q = url.searchParams.get("secret") || "";

    if (secret) {
      if (bearer !== secret && q !== secret) {
        throw new AuthError("Unauthorized", 401);
      }
    } else if (process.env.NODE_ENV === "production") {
      throw new AuthError("CRON_SECRET is not configured", 500);
    }

    const live = await syncLiveRatesToDb();
    await ensureRatesRefreshJob(nextRatesRefreshAt());

    return {
      ok: live.sources.length > 0,
      sources: live.sources,
      errors: live.errors,
      syncedAt: live.syncedAt,
      items: ratesToPublicItems(live.rates),
      nextRefreshAt: nextRatesRefreshAt().toISOString(),
    };
  });
}
