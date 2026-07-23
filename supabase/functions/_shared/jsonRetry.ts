// JSON-parse-with-retry helper shared by every function that consumes fal.ai's LLM router.
//
// fal's openrouter/router endpoints have no JSON-mode / response_format parameter (confirmed
// in AI.md against the live OpenAPI spec) and — per AI.md's live test — the model wraps output
// in ```json markdown fences DESPITE explicit "no markdown fences" instructions. This module is
// the single place that strips fences, parses, validates against the expected shape, and retries
// the underlying model call up to 2x on malformed output. A response that never validates is
// never stored or returned to the client — the caller gets a clean upstream_invalid_output error.

import { ApiError, ErrorCodes } from "./errors.ts";

/** Strips ```json / ``` fences (and any leading/trailing prose whitespace) before JSON.parse. */
export function stripJsonFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

export interface JsonRetryOptions<T> {
  /**
   * Ordered list of attempts to obtain raw model output. Each entry is called only if all
   * prior entries failed to parse+validate. Typical shape: [primary call, retry w/ temp 0 +
   * stricter system prompt, retry on a fallback model] — i.e. up to 2 retries (3 attempts
   * total), per AI.md's documented retry strategy.
   */
  attempts: Array<() => Promise<string>>;
  /** Structural/type validation run after JSON.parse succeeds. */
  validate: (value: unknown) => ValidationResult<T>;
}

export interface JsonRetryOutcome<T> {
  value: T;
  attemptsUsed: number;
}

/**
 * Runs `attempts` in order, stripping fences and validating each raw output, returning the
 * first attempt that produces a value passing `validate`. Throws ApiError(502,
 * upstream_invalid_output) if every attempt fails — the caller must not store or return
 * anything in that case.
 */
export async function parseWithRetry<T>(opts: JsonRetryOptions<T>): Promise<JsonRetryOutcome<T>> {
  if (opts.attempts.length === 0) {
    throw new ApiError(500, ErrorCodes.INTERNAL, "parseWithRetry called with zero attempts");
  }

  const failures: string[] = [];

  for (let i = 0; i < opts.attempts.length; i++) {
    let raw: string;
    try {
      raw = await opts.attempts[i]();
    } catch (e) {
      failures.push(`attempt ${i + 1} call failed: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFences(raw));
    } catch (e) {
      failures.push(`attempt ${i + 1} JSON.parse failed: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    const result = opts.validate(parsed);
    if (result.ok) {
      return { value: result.value, attemptsUsed: i + 1 };
    }
    failures.push(`attempt ${i + 1} validation failed: ${result.errors.join("; ")}`);
  }

  throw new ApiError(
    502,
    ErrorCodes.UPSTREAM_INVALID_OUTPUT,
    `AI returned invalid output after ${opts.attempts.length} attempt(s): ${failures.join(" | ")}`,
  );
}
