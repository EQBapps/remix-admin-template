export type PipelineStatus = "idea" | "scripted" | "generated" | "approved" | "published";

export type VideoFormat = "landscape" | "portrait";

export type Platform = "youtube" | "instagram" | "tiktok";

export interface ContentTopic {
  id: string;
  created_at: string;
  week_label: string;
  title: string;
  hook: string;
  keywords: string[];
  search_volume_estimate: "low" | "medium" | "high";
  competition_estimate: "low" | "medium" | "high";
  status: PipelineStatus;
  script?: ContentScript;
  videos?: ContentVideo[];
}

export interface ContentScript {
  id: string;
  created_at: string;
  topic_id: string;
  body: string;
  word_count: number;
  safety_flagged: boolean;
  safety_notes?: string;
  approved_at?: string;
}

export interface ContentVideo {
  id: string;
  created_at: string;
  topic_id: string;
  higgsfield_job_id?: string;
  format: VideoFormat;
  resolution: string;
  duration_sec?: number;
  video_url?: string;
  thumbnail_url?: string;
  generation_cost_usd?: number;
  status: "pending" | "generating" | "ready" | "failed";
  publishes?: ContentPublish[];
}

export interface ContentPublish {
  id: string;
  created_at: string;
  video_id: string;
  platform: Platform;
  platform_video_id?: string;
  scheduled_at?: string;
  published_at?: string;
  status: "pending" | "scheduled" | "published" | "failed";
}

export interface PipelineRun {
  id: string;
  created_at: string;
  week_label: string;
  topics_count: number;
  videos_generated: number;
  videos_published: number;
  total_cost_usd: number;
  higgsfield_credits_used: number;
  notes?: string;
}

export interface AnalyticsSnapshot {
  id: string;
  captured_at: string;
  video_id: string;
  platform: Platform;
  views: number;
  watch_time_sec: number;
  avg_view_duration_sec?: number;
  likes: number;
  comments: number;
  retention_pct?: number;
}

export interface HiggsfieldCreditBalance {
  credits_remaining: number;
  credits_used: number;
  plan: string;
}

export interface WeeklyBatch {
  week_label: string;
  topics: ContentTopic[];
  run?: PipelineRun;
}
