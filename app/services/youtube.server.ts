// YouTube Data API v3 — requires OAuth2 access token stored in env or DB

const BASE_URL = "https://www.googleapis.com/youtube/v3";
const UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3";

function getToken() {
  const token = process.env.YOUTUBE_ACCESS_TOKEN;
  if (!token) throw new Error("YOUTUBE_ACCESS_TOKEN is not set");
  return token;
}

export interface VideoMetadata {
  title: string;
  description: string;
  tags: string[];
  categoryId?: string;       // "27" = Education
  privacyStatus?: "public" | "private" | "unlisted";
  scheduledAt?: Date;
  madeForKids: boolean;
}

export interface UploadedVideo {
  youtube_video_id: string;
  url: string;
}

export async function uploadVideo(
  videoPath: string,
  meta: VideoMetadata
): Promise<UploadedVideo> {
  const snippet = {
    title: meta.title,
    description: buildDescription(meta.description, meta.tags),
    tags: meta.tags,
    categoryId: meta.categoryId ?? "27",
    defaultLanguage: "en",
  };

  const status: Record<string, unknown> = {
    privacyStatus: meta.scheduledAt ? "private" : (meta.privacyStatus ?? "public"),
    selfDeclaredMadeForKids: meta.madeForKids,
  };

  if (meta.scheduledAt) {
    status.publishAt = meta.scheduledAt.toISOString();
    status.privacyStatus = "private"; // required for scheduled
  }

  // Resumable upload initiation
  const initRes = await fetch(
    `${UPLOAD_URL}/videos?uploadType=resumable&part=snippet,status`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify({ snippet, status }),
    }
  );

  if (!initRes.ok) {
    throw new Error(`YouTube upload init failed: ${initRes.status}`);
  }

  const uploadUri = initRes.headers.get("Location");
  if (!uploadUri) throw new Error("YouTube did not return upload URI");

  // Stream the video file
  const { createReadStream, statSync } = await import("fs");
  const stats = statSync(videoPath);
  const stream = createReadStream(videoPath);

  const uploadRes = await fetch(uploadUri, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(stats.size),
    },
    body: stream as unknown as BodyInit,
    duplex: "half",
  } as RequestInit);

  if (!uploadRes.ok) {
    throw new Error(`YouTube video upload failed: ${uploadRes.status}`);
  }

  const data = await uploadRes.json();
  return {
    youtube_video_id: data.id,
    url: `https://www.youtube.com/watch?v=${data.id}`,
  };
}

export async function setThumbnail(videoId: string, thumbnailPath: string): Promise<void> {
  const { createReadStream, statSync } = await import("fs");
  const stats = statSync(thumbnailPath);
  const stream = createReadStream(thumbnailPath);

  const res = await fetch(
    `${UPLOAD_URL}/thumbnails/set?videoId=${videoId}&uploadType=media`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "image/jpeg",
        "Content-Length": String(stats.size),
      },
      body: stream as unknown as BodyInit,
      duplex: "half",
    } as RequestInit
  );

  if (!res.ok) throw new Error(`YouTube thumbnail upload failed: ${res.status}`);
}

export async function getVideoAnalytics(videoId: string) {
  const metricsRes = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?` +
      new URLSearchParams({
        ids: "channel==MINE",
        filters: `video==${videoId}`,
        metrics: "views,estimatedMinutesWatched,averageViewDuration,likes,comments",
        dimensions: "video",
        startDate: "2020-01-01",
        endDate: new Date().toISOString().slice(0, 10),
      }),
    { headers: { Authorization: `Bearer ${getToken()}` } }
  );

  if (!metricsRes.ok) throw new Error(`YouTube Analytics fetch failed: ${metricsRes.status}`);
  return metricsRes.json();
}

function buildDescription(body: string, tags: string[]): string {
  const hashTags = tags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" ");
  return `${body}\n\n${hashTags}\n\n⚠️ This channel is made for kids and complies with COPPA.`;
}
