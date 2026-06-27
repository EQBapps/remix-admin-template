const OPENAI_BASE = "https://api.openai.com/v1";

function getHeaders() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
}

export interface ThumbnailOptions {
  title: string;
  characterDescription: string;
  emotion?: "excited" | "curious" | "happy" | "surprised";
  backgroundColor?: string;
}

export interface GeneratedImage {
  url: string;
  revised_prompt?: string;
}

export async function generateThumbnail(opts: ThumbnailOptions): Promise<GeneratedImage> {
  const prompt = [
    `Bold, high-contrast YouTube thumbnail for a kids educational channel.`,
    `3D animated character close-up: ${opts.characterDescription}, expression: ${opts.emotion ?? "excited"}.`,
    `Large readable title text: "${opts.title}".`,
    `Background: ${opts.backgroundColor ?? "vivid gradient, bright primary colors"}.`,
    `Style: modern 3D Pixar-like animation, no text clutter, child-safe, COPPA-compliant.`,
    `No copyrighted characters. No real people. No violence or scary imagery.`,
  ].join(" ");

  const res = await fetch(`${OPENAI_BASE}/images/generations`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt,
      size: "1792x1024",
      quality: "high",
      n: 1,
      output_format: "url",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI image generation failed: ${res.status} — ${err}`);
  }

  const data = await res.json();
  return {
    url: data.data[0].url,
    revised_prompt: data.data[0].revised_prompt,
  };
}
