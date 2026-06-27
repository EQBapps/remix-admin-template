import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";

import { getSupabaseClient } from "~/utils/getSupabaseClient";

export const meta: MetaFunction = () => [{ title: "Seed Batch | Content Factory" }];

// Loads this week's researched topics from the JSON file into the DB
export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const weekLabel = form.get("week_label") as string;

  const { readFile } = await import("fs/promises");
  const { join } = await import("path");

  const filePath = join(process.cwd(), "data", "weekly-topics", `${weekLabel}.json`);
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    throw new Response(`No topic file found for ${weekLabel}`, { status: 404 });
  }

  const batch = JSON.parse(raw);
  const supabase = getSupabaseClient();

  for (const t of batch.topics) {
    // Upsert topic
    const { data: topic, error: topicErr } = await supabase
      .from("content_topics")
      .insert({
        week_label: batch.week_label,
        title: t.title,
        hook: t.hook,
        keywords: t.keywords,
        search_volume_estimate: t.search_volume_estimate,
        competition_estimate: t.competition_estimate,
        status: "idea",
      })
      .select()
      .single();

    if (topicErr) throw new Response(topicErr.message, { status: 500 });

    // Insert script
    if (t.script?.body) {
      await supabase.from("content_scripts").insert({
        topic_id: topic.id,
        body: t.script.body,
        safety_flagged: false,
      });
    }
  }

  // Create pipeline run record
  await supabase.from("pipeline_runs").insert({
    week_label: batch.week_label,
    topics_count: batch.topics.length,
  });

  return Response.json({ ok: true, count: batch.topics.length, week_label: batch.week_label });
}

export default function SeedBatch() {
  const fetcher = useFetcher<typeof action>();
  const result = fetcher.data;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 lg:text-3xl mb-2">Seed Weekly Batch</h1>
      <p className="text-sm text-slate-500 mb-8">
        Load a researched topic file from <code>data/weekly-topics/</code> into the pipeline.
      </p>

      <div className="max-w-md bg-white rounded-xl shadow-md p-6">
        <fetcher.Form method="POST" className="space-y-4">
          <div>
            <label htmlFor="week_label" className="block text-sm font-medium text-slate-700 mb-1">
              Week Label
            </label>
            <input
              id="week_label"
              name="week_label"
              type="text"
              defaultValue={currentWeekLabel()}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="e.g. 2026-W26"
            />
            <p className="mt-1 text-xs text-slate-400">
              Must match a file in <code>data/weekly-topics/</code>
            </p>
          </div>

          <button
            type="submit"
            disabled={fetcher.state !== "idle"}
            className="w-full px-4 py-2 text-sm font-medium text-white rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 transition"
          >
            {fetcher.state !== "idle" ? "Loading..." : "Seed Batch"}
          </button>
        </fetcher.Form>

        {result && "ok" in result && result.ok && (
          <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
            Seeded {result.count} topics for week {result.week_label}.
          </div>
        )}
      </div>
    </div>
  );
}

function currentWeekLabel(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}
