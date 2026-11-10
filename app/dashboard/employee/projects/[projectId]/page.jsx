"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { HealthBar, Skeleton, Spinner, Toast } from "../../../../components/UiEffects";

const statusStyles = {
  ON_TRACK: "bg-emerald-100 text-emerald-800",
  AT_RISK: "bg-amber-100 text-amber-800",
  CRITICAL: "bg-rose-100 text-rose-800",
  COMPLETED: "bg-sky-100 text-sky-800",
};
const severityStyles = {
  LOW: "bg-emerald-100 text-emerald-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-rose-100 text-rose-800",
};
const statusLabels = { ON_TRACK: "On Track", AT_RISK: "At Risk", CRITICAL: "Critical", COMPLETED: "Completed" };

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function ProjectSkeleton() {
  return <div aria-label="Loading project" className="space-y-5"><Skeleton className="h-40 rounded-2xl" /><div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div></div>;
}

export default function EmployeeProjectPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [checkin, setCheckin] = useState({ progressSummary: "", blockers: "", confidenceLevel: "3", completionPercentage: "" });
  const [riskForm, setRiskForm] = useState({ title: "", severity: "MEDIUM", mitigationPlan: "" });
  const [mitigationPlans, setMitigationPlans] = useState({});
  const [savingCheckin, setSavingCheckin] = useState(false);
  const [savingRisk, setSavingRisk] = useState(false);
  const [savingRiskId, setSavingRiskId] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  const loadProject = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const response = await fetch(`/api/employee/projects/${projectId}`, { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load project details.");
      setData(result);
      setMitigationPlans(Object.fromEntries((result.risks || []).map((risk) => [risk._id, risk.mitigationPlan || ""])));
      setActionError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load project details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    const timer = setTimeout(() => loadProject(true), 0);
    return () => clearTimeout(timer);
  }, [loadProject]);

  async function submitCheckin(event) {
    event.preventDefault();
    setActionError("");
    setNotice("");
    setSavingCheckin(true);
    try {
      const response = await fetch("/api/employee/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          progressSummary: checkin.progressSummary,
          blockers: checkin.blockers,
          confidenceLevel: Number(checkin.confidenceLevel),
          completionPercentage: Number(checkin.completionPercentage),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to submit your check-in.");
      setNotice("Your weekly check-in was submitted successfully.");
      setCheckin({ progressSummary: "", blockers: "", confidenceLevel: "3", completionPercentage: "" });
      await loadProject();
    } catch (submitError) {
      setActionError(submitError.message || "Unable to submit your check-in.");
    } finally {
      setSavingCheckin(false);
    }
  }

  async function submitRisk(event) {
    event.preventDefault();
    setActionError("");
    setNotice("");
    setSavingRisk(true);
    try {
      const response = await fetch(`/api/employee/projects/${projectId}/risks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(riskForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to create the risk.");
      setNotice("Risk reported successfully.");
      setRiskForm({ title: "", severity: "MEDIUM", mitigationPlan: "" });
      await loadProject();
    } catch (submitError) {
      setActionError(submitError.message || "Unable to create the risk.");
    } finally {
      setSavingRisk(false);
    }
  }

  async function updateRisk(risk, changes) {
    setActionError("");
    setNotice("");
    setSavingRiskId(risk._id);
    try {
      const response = await fetch(`/api/employee/projects/${projectId}/risks/${risk._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to update the risk.");
      setNotice(changes.status ? `Risk marked ${changes.status.toLowerCase()}.` : "Mitigation plan updated.");
      await loadProject();
    } catch (updateError) {
      setActionError(updateError.message || "Unable to update the risk.");
    } finally {
      setSavingRiskId("");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const project = data?.project;
  const checkinExists = Boolean(data?.checkin);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-900 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/dashboard/employee" className="text-sm font-medium text-emerald-700 hover:text-emerald-900">← Employee dashboard</Link>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Project Pulse · Project workspace</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{project?.name || "Project details"}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => loadProject()} disabled={refreshing} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">{refreshing ? "Refreshing..." : "Refresh"}</button>
            <button type="button" onClick={handleLogout} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Log out</button>
          </div>
        </header>

        {error && <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={() => loadProject(true)} className="font-semibold underline">Retry</button></div>}
        <Toast key={notice} message={notice} onDismiss={() => setNotice("")} />
        {actionError && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{actionError}</div>}

        {loading ? <ProjectSkeleton /> : project ? (
          <>
            <section data-reveal className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold">{project.name}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[project.status] || statusStyles.AT_RISK}`}>{statusLabels[project.status] || "At Risk"}</span>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{project.description || "No project description provided."}</p>
                </div>
                <div className="min-w-32 rounded-xl bg-slate-50 px-4 py-3 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Health score</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{project.healthScore ?? 0}<span className="text-sm text-slate-400">/100</span></p>
                  <div className="mt-2"><HealthBar value={project.healthScore} /></div>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <DetailMetric label="Project timeline" value={`${formatDate(project.startDate)} – ${formatDate(project.endDate)}`} />
                <DetailMetric label="Latest estimated completion" value={`${project.completionPercentage ?? data.checkin?.completionPercentage ?? 0}%`} />
                <DetailMetric label="This week’s check-in" value={checkinExists ? "Submitted" : "Pending"} />
              </div>
            </section>

            <div className="grid items-start gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold">Weekly check-in</h2>
                    <p className="mt-1 text-sm text-slate-500">One submission per project each ISO week (Monday–Sunday).</p>
                  </div>
                  {checkinExists ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm font-semibold text-emerald-800">This week’s check-in is submitted</p>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{data.checkin.progressSummary}</p>
                      {data.checkin.blockers && <p className="mt-2 text-sm text-slate-600"><span className="font-medium">Blockers:</span> {data.checkin.blockers}</p>}
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-medium text-slate-600">
                        <span>Confidence: {data.checkin.confidenceLevel}/5</span>
                        <span>Estimated completion: {data.checkin.completionPercentage}%</span>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={submitCheckin} className="space-y-4">
                      <label className="block text-sm font-medium text-slate-700">
                        Progress summary <span className="text-rose-600">*</span>
                        <textarea required maxLength={2000} rows={3} value={checkin.progressSummary} onChange={(event) => setCheckin({ ...checkin, progressSummary: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-emerald-600 focus:bg-white" placeholder="What did you accomplish this week?" />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Blockers or challenges
                        <textarea maxLength={2000} rows={2} value={checkin.blockers} onChange={(event) => setCheckin({ ...checkin, blockers: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-emerald-600 focus:bg-white" placeholder="Anything slowing you down? (optional)" />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-medium text-slate-700">Confidence level <span className="text-rose-600">*</span>
                          <select required value={checkin.confidenceLevel} onChange={(event) => setCheckin({ ...checkin, confidenceLevel: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-600 focus:bg-white">
                            {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}
                          </select>
                        </label>
                        <label className="block text-sm font-medium text-slate-700">Estimated completion (%) <span className="text-rose-600">*</span>
                          <input required type="number" min="0" max="100" step="1" value={checkin.completionPercentage} onChange={(event) => setCheckin({ ...checkin, completionPercentage: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-600 focus:bg-white" placeholder="0–100" />
                        </label>
                      </div>
                      <button type="submit" disabled={savingCheckin} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">{savingCheckin && <Spinner label="Submitting check-in" />}{savingCheckin ? "Submitting..." : "Submit weekly check-in"}</button>
                    </form>
                  )}
                </section>

                <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold">Project risks</h2>
                    <p className="mt-1 text-sm text-slate-500">Report and maintain delivery risks for this project.</p>
                  </div>
                  {data.risks.length === 0 ? <p className="mb-5 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No risks reported for this project.</p> : (
                    <div className="mb-6 space-y-4">
                      {data.risks.map((risk) => (
                        <article key={risk._id} className="rounded-xl border border-slate-200 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <h3 className="font-semibold text-slate-900">{risk.title}</h3>
                            <div className="flex gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityStyles[risk.severity] || severityStyles.LOW}`}>{risk.severity}</span>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${risk.status === "OPEN" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>{risk.status}</span>
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{risk.mitigationPlan || "No mitigation plan provided."}</p>
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <input aria-label={`Mitigation plan for ${risk.title}`} value={mitigationPlans[risk._id] ?? ""} onChange={(event) => setMitigationPlans({ ...mitigationPlans, [risk._id]: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:bg-white" placeholder="Update mitigation plan" />
                            <button type="button" disabled={savingRiskId === risk._id || (mitigationPlans[risk._id] ?? "") === (risk.mitigationPlan || "")} onClick={() => updateRisk(risk, { mitigationPlan: mitigationPlans[risk._id] ?? "" })} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{savingRiskId === risk._id && <Spinner label="Saving risk" />}{savingRiskId === risk._id ? "Saving..." : "Save plan"}</button>
                            <button type="button" disabled={savingRiskId === risk._id} onClick={() => updateRisk(risk, { status: risk.status === "OPEN" ? "RESOLVED" : "OPEN" })} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">{risk.status === "OPEN" ? "Resolve" : "Reopen"}</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                  <form onSubmit={submitRisk} className="space-y-3 border-t border-slate-100 pt-5">
                    <h3 className="text-sm font-semibold text-slate-800">Report a risk</h3>
                    <label className="block text-sm font-medium text-slate-700">Title <span className="text-rose-600">*</span>
                      <input required maxLength={200} value={riskForm.title} onChange={(event) => setRiskForm({ ...riskForm, title: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-emerald-600 focus:bg-white" placeholder="Briefly describe the risk" />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700">Severity
                        <select value={riskForm.severity} onChange={(event) => setRiskForm({ ...riskForm, severity: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-600 focus:bg-white">
                          <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
                        </select>
                      </label>
                      <label className="block text-sm font-medium text-slate-700">Mitigation plan
                        <input maxLength={2000} value={riskForm.mitigationPlan} onChange={(event) => setRiskForm({ ...riskForm, mitigationPlan: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-emerald-600 focus:bg-white" placeholder="Optional next steps" />
                      </label>
                    </div>
                    <button type="submit" disabled={savingRisk} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">{savingRisk && <Spinner label="Saving risk" />}{savingRisk ? "Saving..." : "Create risk"}</button>
                  </form>
                </section>
              </div>

              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold">Activity timeline</h2>
                  <p className="mt-1 text-sm text-slate-500">Recent check-ins, client feedback, risks, and status changes.</p>
                </div>
                {data.timeline.length === 0 ? <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No project activity yet.</p> : (
                  <ol className="timeline-list relative space-y-0">
                    {data.timeline.map((item, index) => (
                      <li key={item.id} style={{ "--item-index": index }} className="relative flex gap-3 pb-6 last:pb-0">
                        {index < data.timeline.length - 1 && <span aria-hidden="true" className="absolute left-[11px] top-6 h-full w-px bg-slate-200" />}
                        <span aria-hidden="true" className={`relative mt-1 h-6 w-6 shrink-0 rounded-full ring-4 ring-white ${item.type === "FEEDBACK_SUBMITTED" ? "bg-sky-500" : item.type.startsWith("RISK") ? "bg-rose-500" : item.type === "PROJECT_STATUS_CHANGED" ? "bg-amber-500" : "bg-emerald-500"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-6 text-slate-800">{item.description}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.actorName} · {String(item.actorRole).toLowerCase()} · {formatDateTime(item.date)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </>
        ) : null}

        <footer className="mt-10 border-t border-slate-200 py-5 text-center text-xs text-slate-500">Project Pulse · Your team’s project health, in one place.</footer>
      </div>
    </main>
  );
}

function DetailMetric({ label, value }) {
  return <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div>;
}
