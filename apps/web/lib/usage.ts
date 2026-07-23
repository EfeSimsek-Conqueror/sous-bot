// Mirrors supabase/functions/_shared/entitlements.ts constants so the
// client's optimistic usage display always agrees with the server's
// authoritative metering.
export const FREE_MONTHLY_GENERATION_LIMIT = 10;

/** "YYYY-MM" in UTC — matches the `period` column format server-side. */
export function currentPeriod(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
