type HeadersLike = { get(name: string): string | null };

export type PublicSubmissionRateScope = "lead_form" | "booking";

const WINDOW_MS = 15 * 60 * 1000;
const limits: Record<PublicSubmissionRateScope, number> = {
  lead_form: 40,
  booking: 30,
};
const buckets = new Map<
  string,
  {
    count: number;
    windowStart: number;
  }
>();
const SWEEP_EVERY_MS = 10 * 60 * 1000;
let lastSweep = 0;

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_EVERY_MS || buckets.size < 2048) {
    return;
  }
  lastSweep = now;
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.windowStart >= WINDOW_MS * 2) {
      buckets.delete(key);
    }
  }
}

function clientIpFromHeaders(headers: HeadersLike): string {
  const forwarded = headers.get("x-forwarded-for")?.trim();
  if (forwarded) {
    const firstSegment = forwarded.split(",")[0]?.trim();
    if (firstSegment) return firstSegment;
  }
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

export function checkPublicSubmissionRate(
  headersList: HeadersLike,
  scope: PublicSubmissionRateScope,
): { ok: true } | { ok: false; message: string } {
  const ip = clientIpFromHeaders(headersList);
  const key = `${scope}:${ip}`;
  const max = limits[scope];
  const now = Date.now();
  sweep(now);

  let bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    bucket = { count: 0, windowStart: now };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return {
      ok: false,
      message:
        "Too many attempts from your network. Please try again in a few minutes.",
    };
  }

  return { ok: true };
}
