import type { HiggsfieldCreditBalance } from "~/types/factory";

const BASE_URL = "https://api.higgsfield.ai/v1";

function getHeaders() {
  const key = process.env.HIGGSFIELD_API_KEY;
  if (!key) throw new Error("HIGGSFIELD_API_KEY is not set");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
}

export async function getCredits(): Promise<HiggsfieldCreditBalance> {
  const res = await fetch(`${BASE_URL}/credits`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Higgsfield credits fetch failed: ${res.status}`);
  return res.json();
}

export interface GenerateVideoParams {
  prompt: string;
  soul_id?: string;         // Higgsfield Soul ID for character consistency
  reference_image_url?: string;
  duration_sec?: number;    // 10–15
  width: number;
  height: number;
  seed?: number;
}

export interface GenerateVideoResponse {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  estimated_cost_credits: number;
}

export async function generateVideo(params: GenerateVideoParams): Promise<GenerateVideoResponse> {
  const body = {
    model: "seedance-1-pro",
    prompt: params.prompt,
    soul_id: params.soul_id ?? process.env.HIGGSFIELD_SOUL_ID,
    reference_image_url: params.reference_image_url,
    duration: params.duration_sec ?? 12,
    width: params.width,
    height: params.height,
    seed: params.seed,
    style: "3d_animation",
    safety_filter: true,
  };

  const res = await fetch(`${BASE_URL}/videos/generate`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Higgsfield generate failed: ${res.status} — ${err}`);
  }
  return res.json();
}

export interface JobStatus {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  video_url?: string;
  thumbnail_url?: string;
  duration_sec?: number;
  credits_used?: number;
  error?: string;
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${BASE_URL}/videos/${jobId}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Higgsfield job status failed: ${res.status}`);
  return res.json();
}

export async function generateVideoAndThumbnail(
  prompt: string,
  format: "landscape" | "portrait"
): Promise<{ landscape?: GenerateVideoResponse; portrait?: GenerateVideoResponse }> {
  const dims = format === "portrait" ? { width: 1080, height: 1920 } : { width: 1280, height: 720 };
  const job = await generateVideo({ prompt, ...dims });
  return { [format]: job };
}
