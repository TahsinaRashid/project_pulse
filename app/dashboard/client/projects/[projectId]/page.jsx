"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ClientShell from "../../ClientShell";
import { HealthBar, Skeleton, Spinner, Toast } from "../../../../components/UiEffects";

const statusStyles = {
  ON_TRACK: "bg-emerald-100 text-emerald-800",
  AT_RISK: "bg-amber-100 text-amber-800",
  CRITICAL: "bg-rose-100 text-rose-800",
  COMPLETED: "bg-sky-100 text-sky-800",
};
const statusLabels = {
  ON_TRACK: "On Track",
  AT_RISK: "At Risk",
  CRITICAL: "Critical",
  COMPLETED: "Completed",
};

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not set"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function ProjectSkeleton() {
  return (
    <div aria-label="Loading project" className="space-y-6">
      <Skeleton className="h-48 rounded-3xl ring-1 ring-[#e2e7dd]" />
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Skeleton className="h-[34rem] rounded-2xl ring-1 ring-[#e2e7dd]" />
        <Skeleton className="h-[34rem] rounded-2xl ring-1 ring-[#e2e7dd]" />
      </div>
    </div>
  );
}

function RatingControl({ label, value, onChange }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-[#42574a]">{label} <span className="text-rose-600">*</span></legend>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <label key={rating} className={`grid size-10 cursor-pointer place-items-center rounded-xl border text-sm font-semibold transition ${Number(value) === rating ? "border-[#214b3a] bg-[#214b3a] text-white" : "border-[#d7dfd4] bg-white text-[#526458] hover:border-[#93aa95]"}`}>
            <input className="sr-only" type="radio" name={label} value={rating} checked={Number(value) === rating} onChange={() => onChange(String(rating))} required />
            {rating}
          </label>
        ))}
        <span className="self-center text-xs text-[#87938a]">1 = low · 5 = high</span>
      </div>
    </fieldset>
  );
}

function SubmittedFeedback({ feedback }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
      <p className="font-semibold text-emerald-900">This week’s feedback is submitted</p>
      <p className="mt-1 text-xs text-emerald-800">Submitted {formatDateTime(feedback.createdAt || feedback.weekStartDate)}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-[#718074]">Satisfaction</dt><dd className="mt-1 font-semibold text-[#203a2d]">{feedback.satisfactionRating}/5</dd></div>
        <div><dt className="text-xs text-[#718074]">Communication</dt><dd className="mt-1 font-semibold text-[#203a2d]">{feedback.communicationRating}/5</dd></div>
      </dl>
      {feedback.comments && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#526458]">{feedback.comments}</p>}
      {feedback.issueFlagged && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Issue flagged</p>
          <p className="mt-1 leading-6">{feedback.issueDescription || "An issue was flagged."}</p>
        </div>
      )}
    </div>
  );
}

export default function ClientProjectPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({
    satisfactionRating: "3",
    communicationRating: "3",
    comments: "",
    issueFlagged: false,
    issueDescription: "",
  });

  const loadProject = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const response = await fetch(`/api/client/projects/${projectId}`, { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load this project.");
      setData(result);
    } catch (loadError) {
      setError(loadError.message || "Unable to load this project.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    const timer = setTimeout(() => loadProject(true), 0);
    return () => clearTimeout(timer);
  }, [loadProject]);

  async function submitFeedback(event) {
    event.preventDefault();
    setActionError("");
    setNotice("");
    setSubmitting(true);
    try {
      const response = await fetch(`/api/client/projects/${projectId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...feedback,
          satisfactionRating: Number(feedback.satisfactionRating),
          communicationRating: Number(feedback.communicationRating),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to submit your feedback.");
      setNotice("Your feedback was submitted successfully. Thank you for sharing your perspective.");
      setFeedback({ satisfactionRating: "3", communicationRating: "3", comments: "", issueFlagged: false, issueDescription: "" });
      await loadProject();
    } catch (submitError) {
      setActionError(submitError.message || "Unable to submit your feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  const project = data?.project;
  const timeline = data?.timeline || [];
  const status = statusLabels[project?.status] ? project.status : "AT_RISK";

  return (
    <ClientShell>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard/client" className="text-sm font-semibold text-[#52735c] hover:text-[#214b3a]">← Back to your projects</Link>
          <button type="button" onClick={() => loadProject()} disabled={refreshing} className="rounded-full border border-[#cbd6c9] bg-white px-4 py-2 text-sm font-semibold text-[#365541] transition hover:bg-[#f7f7f2] disabled:cursor-wait disabled:opacity-60">
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span>{error}</span>
            <button type="button" onClick={() => loadProject(true)} className="font-semibold underline">Retry</button>
          </div>
        )}
        <Toast key={notice} message={notice} onDismiss={() => setNotice("")} />
        {actionError && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{actionError}</div>}

        {loading ? <ProjectSkeleton /> : project ? (
          <>
            <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#e2e7dd] sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="max-w-3xl">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#66816d]">Client project workspace</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-[#203a2d] sm:text-3xl">{project.name}</h1>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}>{statusLabels[status]}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#68756b]">{project.description || "No project description provided."}</p>
                </div>
                <div className="min-w-36 rounded-2xl bg-[#f3f5ef] px-5 py-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#718074]">Health score</p>
                  <p className="mt-1 text-3xl font-bold text-[#203a2d]">{project.healthScore ?? 0}<span className="ml-1 text-sm font-medium text-[#87938a]">/100</span></p>
                  <div className="mt-2"><HealthBar value={project.healthScore} /></div>
                </div>
              </div>
              <div className="mt-6 grid gap-4 border-t border-[#edf0e9] pt-5 sm:grid-cols-2">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-[#849087]">Timeline</p><p className="mt-1 text-sm font-medium text-[#42574a]">{formatDate(project.startDate)} <span className="text-[#9ba49c]">to</span> {formatDate(project.endDate)}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-[#849087]">This week’s feedback</p><p className={`mt-1 text-sm font-semibold ${data.weekFeedback ? "text-emerald-700" : "text-amber-700"}`}>{data.weekFeedback ? "Submitted" : "Pending"}</p></div>
              </div>
            </section>

            <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#e2e7dd] sm:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-[#203a2d]">Weekly feedback</h2>
                  <p className="mt-1 text-sm leading-6 text-[#718074]">One response per project for each ISO week (Monday–Sunday).</p>
                </div>
                {data.weekFeedback ? <SubmittedFeedback feedback={data.weekFeedback} /> : (
                  <form onSubmit={submitFeedback} className="space-y-5">
                    <RatingControl label="Overall satisfaction" value={feedback.satisfactionRating} onChange={(value) => setFeedback((current) => ({ ...current, satisfactionRating: value }))} />
                    <RatingControl label="Communication clarity" value={feedback.communicationRating} onChange={(value) => setFeedback((current) => ({ ...current, communicationRating: value }))} />
                    <label className="block text-sm font-semibold text-[#42574a]">
                      Comments <span className="font-normal text-[#87938a]">(optional)</span>
                      <textarea rows={4} maxLength={2000} value={feedback.comments} onChange={(event) => setFeedback((current) => ({ ...current, comments: event.target.value }))} className="mt-2 w-full rounded-xl border border-[#d7dfd4] bg-[#fbfcf9] px-3 py-2.5 font-normal leading-6 text-[#20342b] outline-none transition focus:border-[#66816d] focus:bg-white" placeholder="Share any additional thoughts with your team." />
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e2e7dd] bg-[#fbfcf9] p-3.5">
                      <input type="checkbox" checked={feedback.issueFlagged} onChange={(event) => setFeedback((current) => ({ ...current, issueFlagged: event.target.checked }))} className="mt-0.5 size-4 accent-[#214b3a]" />
                      <span><span className="block text-sm font-semibold text-[#42574a]">Flag an issue</span><span className="mt-0.5 block text-xs leading-5 text-[#718074]">Let your team know if something needs attention.</span></span>
                    </label>
                    {feedback.issueFlagged && (
                      <label className="block text-sm font-semibold text-[#42574a]">
                        Issue description <span className="text-rose-600">*</span>
                        <textarea required minLength={5} maxLength={500} rows={3} value={feedback.issueDescription} onChange={(event) => setFeedback((current) => ({ ...current, issueDescription: event.target.value }))} className="mt-2 w-full rounded-xl border border-[#d7dfd4] bg-[#fbfcf9] px-3 py-2.5 font-normal leading-6 text-[#20342b] outline-none transition focus:border-[#66816d] focus:bg-white" placeholder="Briefly describe the issue (5–500 characters)." />
                      </label>
                    )}
                    <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#214b3a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#18392c] disabled:cursor-not-allowed disabled:opacity-60">
                      {submitting && <Spinner label="Submitting feedback" />}
                      {submitting ? "Submitting feedback…" : "Submit weekly feedback"}
                    </button>
                  </form>
                )}
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#e2e7dd] sm:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-[#203a2d]">Project activity</h2>
                  <p className="mt-1 text-sm text-[#718074]">Recent check-ins, feedback, risks, and status changes</p>
                </div>
                {timeline.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#d7dfd4] px-4 py-10 text-center text-sm text-[#718074]">Activity will appear here as your project progresses.</div>
                ) : (
                  <ol className="timeline-list space-y-0">
                    {timeline.map((item, index) => (
                      <li key={item.id} style={{ "--item-index": index }} className="relative flex gap-4 pb-6 last:pb-0">
                        {index < timeline.length - 1 && <span aria-hidden="true" className="absolute left-[7px] top-4 h-full w-px bg-[#e2e7dd]" />}
                        <span aria-hidden="true" className={`relative mt-1.5 size-4 shrink-0 rounded-full border-[3px] border-white ring-1 ${item.type === "FEEDBACK_SUBMITTED" ? "bg-[#f3a879] ring-[#f3a879]" : item.type.includes("RISK") ? "bg-amber-500 ring-amber-500" : item.type === "PROJECT_STATUS_CHANGED" ? "bg-[#52735c] ring-[#52735c]" : "bg-[#8ba78d] ring-[#8ba78d]"}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                            <p className="text-sm font-semibold text-[#354a3c]">{item.actorName} <span className="font-normal text-[#849087]">· {String(item.actorRole || "TEAM").replaceAll("_", " ")}</span></p>
                            <time className="text-xs text-[#849087]">{formatDateTime(item.date)}</time>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-[#68756b]">{item.description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </>
        ) : null}
      </main>
    </ClientShell>
  );
}
