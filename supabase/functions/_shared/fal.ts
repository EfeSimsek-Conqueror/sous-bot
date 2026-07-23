// fal.ai client — verified live against the production API on 2026-07-23 (see /AI.md).
// FAL_KEY is read from Deno env ONLY. It never reaches a client.

const FAL_KEY = Deno.env.get("FAL_KEY")!;

function falHeaders(): HeadersInit {
  return { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" };
}

// ---------- Text (recipe / meal-plan / adaptation) ----------

export interface FalRouterRequest {
  prompt: string;
  model: string; // e.g. "google/gemini-2.5-flash"
  system_prompt?: string;
  reasoning?: boolean;
  temperature?: number; // 0-2
  max_tokens?: number;
}

export interface FalUsage {
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number;
  cost: number;
  prompt_tokens_details?: { cached_tokens: number; cache_write_tokens: number };
}

export interface FalRouterResponse {
  output: string; // JSON string OR ```json fenced JSON string — must be cleaned + parsed
  reasoning: string | null;
  partial: boolean;
  error: string | null;
  usage: FalUsage | null;
}

// ---------- Vision (ingredient detection) ----------

export interface FalVisionRequest {
  prompt: string;
  image_urls: string[];
  model: string;
  system_prompt?: string;
  reasoning?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface FalVisionResponse {
  output: string;
  usage: FalUsage;
}

// ---------- Image (dish photo, async/queue) ----------

export interface FalImageRequest {
  prompt: string;
  seed?: number;
  num_images?: number;
  output_format?: "jpeg" | "png";
  safety_tolerance?: "1" | "2" | "3" | "4" | "5" | "6";
  enhance_prompt?: boolean;
  image_url?: string;
  aspect_ratio?: string;
  raw?: boolean;
}

export interface FalQueueSubmitResponse {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";
  request_id: string;
  response_url: string;
  status_url: string;
  cancel_url: string;
  queue_position: number;
}

export interface FalQueueStatusResponse {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";
  queue_position?: number;
  logs?: { message: string; timestamp: string }[];
  metrics?: { inference_time?: number };
}

export interface FalImageResult {
  images: { url: string; width: number; height: number; content_type: string }[];
  seed: number;
  has_nsfw_concepts: boolean[];
  prompt: string;
}

// ---------- Models ----------

export const MODELS = {
  text: "google/gemini-2.5-flash",
  textFallback: "anthropic/claude-haiku-4.5",
  vision: "google/gemini-2.5-flash",
  visionFallback: "openai/gpt-4o",
} as const;

// ---------- Fetch helpers ----------

export async function callFalRouter(req: FalRouterRequest): Promise<FalRouterResponse> {
  const res = await fetch("https://fal.run/openrouter/router", {
    method: "POST",
    headers: falHeaders(),
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`fal router ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function callFalVision(req: FalVisionRequest): Promise<FalVisionResponse> {
  const res = await fetch("https://fal.run/openrouter/router/vision", {
    method: "POST",
    headers: falHeaders(),
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`fal vision ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function submitDishImage(req: FalImageRequest): Promise<FalQueueSubmitResponse> {
  const res = await fetch("https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra", {
    method: "POST",
    headers: falHeaders(),
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`fal image submit ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getDishImageStatus(statusUrl: string): Promise<FalQueueStatusResponse> {
  const res = await fetch(statusUrl, { headers: { Authorization: `Key ${FAL_KEY}` } });
  if (!res.ok) throw new Error(`fal image status ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getDishImageResult(responseUrl: string): Promise<FalImageResult> {
  const res = await fetch(responseUrl, { headers: { Authorization: `Key ${FAL_KEY}` } });
  if (!res.ok) throw new Error(`fal image result ${res.status}: ${await res.text()}`);
  return res.json();
}

/** One-shot poll loop — only used where we've chosen to accept blocking (kept short, capped). */
export async function pollDishImage(
  statusUrl: string,
  responseUrl: string,
  { maxWaitMs = 18_000, intervalMs = 1000 }: { maxWaitMs?: number; intervalMs?: number } = {},
): Promise<FalImageResult | null> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const status = await getDishImageStatus(statusUrl);
    if (status.status === "COMPLETED") {
      return getDishImageResult(responseUrl);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null; // caller should treat as "still pending, poll again later"
}
