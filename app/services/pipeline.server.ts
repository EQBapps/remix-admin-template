import { getSupabaseClient } from "~/utils/getSupabaseClient";
import { checkScriptSafety } from "./content-safety.server";
import { generateVideo, getCredits, getJobStatus } from "./higgsfield.server";
import { generateThumbnail } from "./openai-image.server";
import { postInstagramReel, postTikTok } from "./social.server";
import { uploadVideo } from "./youtube.server";
import type { ContentTopic, ContentVideo, PipelineStatus } from "~/types/factory";

export async function getCurrentCredits() {
  return getCredits();
}

export async function advanceTopicStatus(topicId: string, to: PipelineStatus) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("content_topics")
    .update({ status: to })
    .eq("id", topicId);
  if (error) throw new Error(error.message);
}

export async function validateScript(topicId: string) {
  const supabase = getSupabaseClient();
  const { data: script, error } = await supabase
    .from("content_scripts")
    .select("*")
    .eq("topic_id", topicId)
    .single();

  if (error || !script) throw new Error("Script not found for topic");

  const result = checkScriptSafety(script.body);

  await supabase
    .from("content_scripts")
    .update({ safety_flagged: !result.safe, safety_notes: result.notes })
    .eq("id", script.id);

  return result;
}

export async function kickOffVideoGeneration(topicId: string) {
  const supabase = getSupabaseClient();

  const { data: topic } = await supabase
    .from("content_topics")
    .select("*, content_scripts(*)")
    .eq("id", topicId)
    .single();

  if (!topic) throw new Error("Topic not found");

  const script = topic.content_scripts?.[0];
  if (!script) throw new Error("No script for this topic");
  if (script.safety_flagged) throw new Error("Script is flagged — human review required");

  const prompt = buildVideoPrompt(topic.title, topic.hook, script.body);

  // Generate both formats
  const [portraitJob, landscapeJob] = await Promise.all([
    generateVideo({ prompt, width: 1080, height: 1920, duration_sec: 12 }),
    generateVideo({ prompt, width: 1280, height: 720, duration_sec: 12 }),
  ]);

  // Insert video rows
  await supabase.from("content_videos").insert([
    {
      topic_id: topicId,
      higgsfield_job_id: portraitJob.job_id,
      format: "portrait",
      resolution: "1080x1920",
      status: "generating",
    },
    {
      topic_id: topicId,
      higgsfield_job_id: landscapeJob.job_id,
      format: "landscape",
      resolution: "1280x720",
      status: "generating",
    },
  ]);

  await advanceTopicStatus(topicId, "generated");
  return { portraitJob, landscapeJob };
}

export async function pollAndFinalizeVideos(topicId: string) {
  const supabase = getSupabaseClient();
  const { data: videos } = await supabase
    .from("content_videos")
    .select("*")
    .eq("topic_id", topicId)
    .eq("status", "generating");

  if (!videos?.length) return;

  for (const video of videos) {
    const job = await getJobStatus(video.higgsfield_job_id);
    if (job.status === "completed") {
      await supabase.from("content_videos").update({
        status: "ready",
        video_url: job.video_url,
        thumbnail_url: job.thumbnail_url,
        duration_sec: job.duration_sec,
        generation_cost_usd: (job.credits_used ?? 0) * 0.01,
      }).eq("id", video.id);
    } else if (job.status === "failed") {
      await supabase.from("content_videos").update({ status: "failed" }).eq("id", video.id);
    }
  }
}

export async function publishTopic(topicId: string) {
  const supabase = getSupabaseClient();
  const { data: topic } = await supabase
    .from("content_topics")
    .select("*, content_scripts(*), content_videos(*)")
    .eq("id", topicId)
    .single();

  if (!topic) throw new Error("Topic not found");

  const landscape = (topic.content_videos as ContentVideo[]).find((v) => v.format === "landscape" && v.status === "ready");
  const portrait = (topic.content_videos as ContentVideo[]).find((v) => v.format === "portrait" && v.status === "ready");

  if (!landscape?.video_url) throw new Error("Landscape video not ready");

  const tags = (topic as ContentTopic).keywords ?? [];

  // YouTube
  const yt = await uploadVideo(landscape.video_url, {
    title: topic.title,
    description: topic.hook,
    tags,
    madeForKids: true,
    scheduledAt: nextScheduledSlot(),
  });

  await supabase.from("content_publishes").insert({
    video_id: landscape.id,
    platform: "youtube",
    platform_video_id: yt.youtube_video_id,
    status: "scheduled",
    scheduled_at: nextScheduledSlot().toISOString(),
  });

  // Instagram + TikTok (portrait cut)
  if (portrait?.video_url) {
    const shortHashtags = tags.slice(0, 3);

    const [igResult, ttResult] = await Promise.all([
      postInstagramReel({ videoUrl: portrait.video_url, caption: topic.hook, hashtags: shortHashtags }),
      postTikTok({ videoUrl: portrait.video_url, caption: topic.hook, hashtags: shortHashtags }),
    ]);

    await supabase.from("content_publishes").insert([
      { video_id: portrait.id, platform: "instagram", platform_video_id: igResult.platform_video_id, status: "published", published_at: new Date().toISOString() },
      { video_id: portrait.id, platform: "tiktok", platform_video_id: ttResult.platform_video_id, status: "published", published_at: new Date().toISOString() },
    ]);
  }

  await advanceTopicStatus(topicId, "published");
}

function buildVideoPrompt(title: string, hook: string, script: string): string {
  return [
    `3D animated educational kids video. Topic: "${title}".`,
    `Opening scene: ${hook}`,
    `Narration context: ${script.slice(0, 300)}`,
    `Style: Pixar-quality 3D animation, bright colors, child-safe, no scary imagery, no real people.`,
    `Character: friendly 3D animated guide character, cheerful expression.`,
    `Setting: colorful educational environment relevant to the topic.`,
  ].join(" ");
}

function nextScheduledSlot(): Date {
  // Schedule for next weekday at 10am UTC
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(10, 0, 0, 0);
  if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1); // skip Sunday
  if (d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 2); // skip Saturday
  return d;
}
