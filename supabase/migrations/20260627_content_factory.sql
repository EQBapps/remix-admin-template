-- Content Factory Pipeline Schema

CREATE TABLE content_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  week_label TEXT NOT NULL,              -- e.g. "2026-W26"
  title TEXT NOT NULL,
  hook TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  search_volume_estimate TEXT,           -- low/medium/high
  competition_estimate TEXT,             -- low/medium/high
  status TEXT NOT NULL DEFAULT 'idea'    -- idea|scripted|generated|approved|published
);

CREATE TABLE content_scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  topic_id UUID NOT NULL REFERENCES content_topics(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  word_count INT GENERATED ALWAYS AS (array_length(regexp_split_to_array(trim(body), '\s+'), 1)) STORED,
  safety_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  safety_notes TEXT,
  approved_at TIMESTAMPTZ
);

CREATE TABLE content_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  topic_id UUID NOT NULL REFERENCES content_topics(id) ON DELETE CASCADE,
  higgsfield_job_id TEXT,
  format TEXT NOT NULL DEFAULT 'landscape',   -- landscape|portrait
  resolution TEXT NOT NULL DEFAULT '1280x720', -- 1280x720|1080x1920
  duration_sec INT,
  video_url TEXT,
  thumbnail_url TEXT,
  generation_cost_usd NUMERIC(8,4),
  status TEXT NOT NULL DEFAULT 'pending'       -- pending|generating|ready|failed
);

CREATE TABLE content_publishes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  video_id UUID NOT NULL REFERENCES content_videos(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,                      -- youtube|instagram|tiktok
  platform_video_id TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'        -- pending|scheduled|published|failed
);

CREATE TABLE pipeline_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  week_label TEXT NOT NULL,
  topics_count INT NOT NULL DEFAULT 0,
  videos_generated INT NOT NULL DEFAULT 0,
  videos_published INT NOT NULL DEFAULT 0,
  total_cost_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  higgsfield_credits_used INT NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  video_id UUID NOT NULL REFERENCES content_videos(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  views INT NOT NULL DEFAULT 0,
  watch_time_sec INT NOT NULL DEFAULT 0,
  avg_view_duration_sec INT,
  likes INT NOT NULL DEFAULT 0,
  comments INT NOT NULL DEFAULT 0,
  retention_pct NUMERIC(5,2)
);

-- Indexes
CREATE INDEX ON content_topics(week_label);
CREATE INDEX ON content_topics(status);
CREATE INDEX ON content_videos(topic_id);
CREATE INDEX ON content_videos(status);
CREATE INDEX ON content_publishes(video_id);
CREATE INDEX ON analytics_snapshots(video_id);
