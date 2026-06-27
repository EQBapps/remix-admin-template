// Instagram Graph API + TikTok Content Posting API

// ─── Instagram ──────────────────────────────────────────────────────────────

const IG_BASE = "https://graph.instagram.com/v21.0";

function getIgToken() {
  const t = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!t) throw new Error("INSTAGRAM_ACCESS_TOKEN is not set");
  return t;
}

function getIgUserId() {
  const id = process.env.INSTAGRAM_USER_ID;
  if (!id) throw new Error("INSTAGRAM_USER_ID is not set");
  return id;
}

export interface SocialPostResult {
  platform: "instagram" | "tiktok";
  platform_video_id: string;
  url?: string;
}

export async function postInstagramReel(opts: {
  videoUrl: string;
  caption: string;
  hashtags: string[];
  coverImageUrl?: string;
}): Promise<SocialPostResult> {
  const userId = getIgUserId();
  const token = getIgToken();
  const caption = `${opts.caption}\n\n${opts.hashtags.map((h) => `#${h}`).join(" ")}`;

  // Step 1: Create media container
  const containerRes = await fetch(`${IG_BASE}/${userId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: opts.videoUrl,
      caption,
      cover_url: opts.coverImageUrl,
      access_token: token,
    }),
  });

  if (!containerRes.ok) throw new Error(`IG container create failed: ${containerRes.status}`);
  const { id: containerId } = await containerRes.json();

  // Step 2: Poll until container is ready (max 60s)
  await waitForIgContainer(containerId, token);

  // Step 3: Publish
  const publishRes = await fetch(`${IG_BASE}/${userId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: token }),
  });

  if (!publishRes.ok) throw new Error(`IG publish failed: ${publishRes.status}`);
  const { id: mediaId } = await publishRes.json();

  return {
    platform: "instagram",
    platform_video_id: mediaId,
    url: `https://www.instagram.com/reel/${mediaId}/`,
  };
}

async function waitForIgContainer(containerId: string, token: string, maxWaitMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(
      `${IG_BASE}/${containerId}?fields=status_code&access_token=${token}`
    );
    const { status_code } = await res.json();
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR") throw new Error("IG media container processing failed");
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("IG media container timed out");
}

// ─── TikTok ─────────────────────────────────────────────────────────────────

const TT_BASE = "https://open.tiktokapis.com/v2";

function getTtToken() {
  const t = process.env.TIKTOK_ACCESS_TOKEN;
  if (!t) throw new Error("TIKTOK_ACCESS_TOKEN is not set");
  return t;
}

export async function postTikTok(opts: {
  videoUrl: string;
  caption: string;
  hashtags: string[];
}): Promise<SocialPostResult> {
  const caption = `${opts.caption} ${opts.hashtags.map((h) => `#${h}`).join(" ")}`;

  // TikTok Content Posting API — URL-based upload
  const initRes = await fetch(`${TT_BASE}/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getTtToken()}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: caption,
        privacy_level: "MUTUAL_FOLLOW_FRIENDS",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: opts.videoUrl,
      },
    }),
  });

  if (!initRes.ok) throw new Error(`TikTok post init failed: ${initRes.status}`);
  const { data } = await initRes.json();

  return {
    platform: "tiktok",
    platform_video_id: data.publish_id,
  };
}
