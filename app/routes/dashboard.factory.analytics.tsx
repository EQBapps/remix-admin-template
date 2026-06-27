import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { getSupabaseClient } from "~/utils/getSupabaseClient";
import type { AnalyticsSnapshot, PipelineRun } from "~/types/factory";

export const meta: MetaFunction = () => [{ title: "Analytics | Content Factory" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const supabase = getSupabaseClient();

  const [{ data: runs }, { data: snapshots }] = await Promise.all([
    supabase.from("pipeline_runs").select("*").order("created_at", { ascending: false }).limit(12),
    supabase
      .from("analytics_snapshots")
      .select("*, content_videos(topic_id, format, content_topics(title))")
      .order("captured_at", { ascending: false })
      .limit(50),
  ]);

  const totalCost = (runs ?? []).reduce((sum, r) => sum + (r.total_cost_usd ?? 0), 0);
  const totalPublished = (runs ?? []).reduce((sum, r) => sum + (r.videos_published ?? 0), 0);
  const totalViews = (snapshots ?? []).reduce((sum, s) => sum + (s.views ?? 0), 0);

  return Response.json({ runs: runs ?? [], snapshots: snapshots ?? [], totalCost, totalPublished, totalViews });
}

export default function Analytics() {
  const { runs, snapshots, totalCost, totalPublished, totalViews } =
    useLoaderData<typeof loader>();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 lg:text-3xl mb-8">Analytics</h1>

      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-3">
        <StatCard label="Total Published Videos" value={String(totalPublished)} />
        <StatCard label="Total Views" value={totalViews.toLocaleString()} />
        <StatCard
          label="Total Generation Cost"
          value={`$${Number(totalCost).toFixed(2)}`}
          note="Higgsfield + OpenAI"
        />
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Pipeline Runs</h2>
        <div className="overflow-x-auto bg-white rounded-xl shadow-md">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Week", "Topics", "Generated", "Published", "Credits Used", "Cost (USD)"].map((h) => (
                  <th key={h} className="p-4 font-medium text-left text-slate-900">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(runs as PipelineRun[]).map((run) => (
                <tr key={run.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-medium">{run.week_label}</td>
                  <td className="p-4">{run.topics_count}</td>
                  <td className="p-4">{run.videos_generated}</td>
                  <td className="p-4">{run.videos_published}</td>
                  <td className="p-4">{run.higgsfield_credits_used}</td>
                  <td className="p-4">${Number(run.total_cost_usd).toFixed(2)}</td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No pipeline runs yet. Start a batch to see data here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Video Performance</h2>
        <div className="overflow-x-auto bg-white rounded-xl shadow-md">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Title", "Platform", "Views", "Watch Time", "Retention %", "Likes"].map((h) => (
                  <th key={h} className="p-4 font-medium text-left text-slate-900">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(snapshots as (AnalyticsSnapshot & { content_videos?: { content_topics?: { title: string } } })[]).map(
                (snap) => (
                  <tr key={snap.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-medium max-w-xs truncate">
                      {snap.content_videos?.content_topics?.title ?? "—"}
                    </td>
                    <td className="p-4 capitalize">{snap.platform}</td>
                    <td className="p-4">{snap.views.toLocaleString()}</td>
                    <td className="p-4">{formatWatchTime(snap.watch_time_sec)}</td>
                    <td className="p-4">
                      {snap.retention_pct != null ? `${snap.retention_pct}%` : "—"}
                    </td>
                    <td className="p-4">{snap.likes.toLocaleString()}</td>
                  </tr>
                )
              )}
              {snapshots.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No analytics data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
    </div>
  );
}

function formatWatchTime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}
