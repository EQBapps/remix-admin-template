import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";

import { getSupabaseClient } from "~/utils/getSupabaseClient";
import type { ContentTopic, PipelineStatus } from "~/types/factory";

export const meta: MetaFunction = () => [{ title: "Content Factory | Pipeline" }];

const COLUMNS: { status: PipelineStatus; label: string; color: string }[] = [
  { status: "idea", label: "Idea", color: "bg-slate-100 border-slate-300" },
  { status: "scripted", label: "Scripted", color: "bg-blue-50 border-blue-300" },
  { status: "generated", label: "Generated", color: "bg-violet-50 border-violet-300" },
  { status: "approved", label: "Approved", color: "bg-amber-50 border-amber-300" },
  { status: "published", label: "Published", color: "bg-green-50 border-green-300" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const week = url.searchParams.get("week") ?? currentWeekLabel();
  const supabase = getSupabaseClient();

  const { data: topics, error } = await supabase
    .from("content_topics")
    .select("*, content_scripts(*), content_videos(*)")
    .eq("week_label", week)
    .order("created_at", { ascending: true });

  if (error) throw new Response(error.message, { status: 500 });

  let credits = null;
  try {
    const { getCurrentCredits } = await import("~/services/pipeline.server");
    credits = await getCurrentCredits();
  } catch {
    // API key not set yet
  }

  return Response.json({ topics: topics ?? [], week, credits });
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const intent = form.get("intent") as string;
  const topicId = form.get("topicId") as string;

  const { advanceTopicStatus, kickOffVideoGeneration, publishTopic, validateScript } =
    await import("~/services/pipeline.server");

  switch (intent) {
    case "advance": {
      const to = form.get("to") as PipelineStatus;
      await advanceTopicStatus(topicId, to);
      break;
    }
    case "validate": {
      await validateScript(topicId);
      await advanceTopicStatus(topicId, "scripted");
      break;
    }
    case "generate": {
      await kickOffVideoGeneration(topicId);
      break;
    }
    case "approve": {
      await advanceTopicStatus(topicId, "approved");
      break;
    }
    case "publish": {
      await publishTopic(topicId);
      break;
    }
    default:
      throw new Response("Unknown intent", { status: 400 });
  }

  return Response.json({ ok: true });
}

export default function FactoryKanban() {
  const { topics, week, credits } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const byStatus = (status: PipelineStatus) =>
    (topics as ContentTopic[]).filter((t) => t.status === status);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 lg:text-3xl">Content Factory</h1>
          <p className="mt-1 text-sm text-slate-500">Week {week}</p>
        </div>
        <div className="flex items-center gap-3">
          {credits ? (
            <div className="px-4 py-2 text-sm font-medium bg-white border rounded-lg shadow-sm border-slate-200">
              <span className="text-slate-500">Higgsfield Credits:</span>{" "}
              <span className="font-semibold text-cyan-600">{credits.credits_remaining}</span>
            </div>
          ) : (
            <div className="px-4 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
              Higgsfield API key not set
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {COLUMNS.map(({ status, label, color }) => (
          <div key={status} className={`flex flex-col gap-3 p-3 rounded-xl border ${color}`}>
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold tracking-wide uppercase text-slate-600">
                {label}
              </span>
              <span className="flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-white text-slate-700 shadow-sm">
                {byStatus(status).length}
              </span>
            </div>

            {byStatus(status).map((topic) => (
              <TopicCard key={topic.id} topic={topic} fetcher={fetcher} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TopicCard({
  topic,
  fetcher,
}: {
  topic: ContentTopic;
  fetcher: ReturnType<typeof useFetcher>;
}) {
  const script = topic.script;
  const videos = topic.videos ?? [];
  const readyVideos = videos.filter((v) => v.status === "ready").length;

  return (
    <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-100 space-y-2">
      <p className="text-sm font-semibold text-slate-900 leading-tight">{topic.title}</p>
      <p className="text-xs text-slate-500 line-clamp-2">{topic.hook}</p>

      <div className="flex flex-wrap gap-1">
        {topic.keywords.slice(0, 2).map((kw) => (
          <span key={kw} className="px-1.5 py-0.5 text-xs bg-cyan-50 text-cyan-700 rounded">
            {kw}
          </span>
        ))}
      </div>

      {script && (
        <div className="text-xs text-slate-400 flex gap-2">
          <span>{script.word_count}w</span>
          {script.safety_flagged && (
            <span className="text-red-500 font-medium">Flagged</span>
          )}
          {!script.safety_flagged && script.approved_at && (
            <span className="text-green-600">Safe</span>
          )}
        </div>
      )}

      {videos.length > 0 && (
        <div className="text-xs text-slate-400">
          {readyVideos}/{videos.length} videos ready
        </div>
      )}

      <ActionButtons topic={topic} fetcher={fetcher} />
    </div>
  );
}

function ActionButtons({
  topic,
  fetcher,
}: {
  topic: ContentTopic;
  fetcher: ReturnType<typeof useFetcher>;
}) {
  const busy = fetcher.state !== "idle";

  const btn = (intent: string, label: string, to?: PipelineStatus) => (
    <fetcher.Form method="POST">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="topicId" value={topic.id} />
      {to && <input type="hidden" name="to" value={to} />}
      <button
        type="submit"
        disabled={busy}
        className="w-full px-2 py-1 text-xs font-medium text-white rounded bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 transition"
      >
        {label}
      </button>
    </fetcher.Form>
  );

  switch (topic.status) {
    case "idea":
      return btn("validate", "Validate Script");
    case "scripted":
      return btn("generate", "Generate Video");
    case "generated":
      return btn("approve", "Approve");
    case "approved":
      return btn("publish", "Publish");
    default:
      return null;
  }
}

function currentWeekLabel(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}
