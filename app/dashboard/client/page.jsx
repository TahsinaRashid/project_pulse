"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ClientShell from "./ClientShell";
import { HealthBar, Skeleton } from "../../components/UiEffects";

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

function DashboardSkeleton() {
  return (
    <div aria-label="Loading client dashboard" className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-2xl ring-1 ring-[#e2e7dd]" />)}
      </div>
      <div data-reveal-stagger className="grid gap-5 lg:grid-cols-2">
        {[1, 2].map((item) => <Skeleton key={item} className="h-64 rounded-2xl ring-1 ring-[#e2e7dd]" />)}
      </div>
    </div>
  );
}

function ProjectCard({ project }) {
  const status = statusLabels[project.status] ? project.status : "AT_RISK";
  return (
    <Link data-reveal href={`/dashboard/client/projects/${project._id}`} className="group block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#e2e7dd] transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#4a795e] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[#20342b] transition group-hover:text-[#214b3a]">{project.name}</h2>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#68756b]">{project.description || "No project description provided."}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}>
          {statusLabels[status]}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#849087]">Project timeline</p>
          <p className="mt-1 text-sm font-medium text-[#42574a]">{formatDate(project.startDate)} <span className="text-[#9ba49c]">to</span> {formatDate(project.endDate)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#849087]">Latest feedback</p>
          <p className="mt-1 text-sm font-medium text-[#42574a]">{project.lastFeedbackAt ? formatDate(project.lastFeedbackAt) : "No feedback yet"}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-[#edf0e9] pt-4">
        <div className="min-w-32">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#849087]">Health score</p>
          <p className="mt-1 text-2xl font-bold text-[#203a2d]">{project.healthScore ?? 0}<span className="ml-1 text-sm font-medium text-[#87938a]">/ 100</span></p>
          <div className="mt-2"><HealthBar value={project.healthScore} /></div>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${project.feedbackSubmittedThisWeek ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
          <span className={`size-2 rounded-full ${project.feedbackSubmittedThisWeek ? "bg-emerald-500" : "bg-amber-500"}`} />
          This week: {project.feedbackSubmittedThisWeek ? "Feedback submitted" : "Feedback pending"}
        </span>
      </div>
      <p className="mt-4 text-right text-sm font-semibold text-[#66816d] transition group-hover:text-[#214b3a]">View project <span aria-hidden="true">→</span></p>
    </Link>
  );
}

function SummaryCard({ label, value, note, accent }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#e2e7dd]">
      <p className="text-sm font-medium text-[#68756b]">{label}</p>
      <p className={`mt-3 text-3xl font-bold ${accent}`}>{value}</p>
      <p className="mt-2 text-xs text-[#849087]">{note}</p>
    </div>
  );
}

export default function ClientDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const response = await fetch("/api/client/dashboard", { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load your dashboard.");
      setDashboard(result);
    } catch (loadError) {
      setError(loadError.message || "Unable to load your dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => loadDashboard(true), 0);
    return () => clearTimeout(timer);
  }, [loadDashboard]);

  const projects = dashboard?.projects || [];
  const stats = dashboard?.stats || {};

  return (
    <ClientShell name={dashboard?.user?.name}>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <section className="mb-8 flex flex-col gap-5 rounded-3xl bg-[#e8eee5] p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#52735c]">Project Pulse · Client portal</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#203a2d] sm:text-4xl">Your project overview</h1>
            <p className="mt-2 text-sm leading-6 text-[#5b6b5e]">
              {dashboard?.user ? `Welcome back, ${dashboard.user.name}. ` : ""}Stay informed and share feedback with your project team.
            </p>
          </div>
          <button type="button" onClick={() => loadDashboard()} disabled={refreshing} className="rounded-full border border-[#cbd6c9] bg-white px-4 py-2.5 text-sm font-semibold text-[#365541] transition hover:bg-[#f7f7f2] disabled:cursor-wait disabled:opacity-60">
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </section>

        {error && (
          <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span>{error}</span>
            <button type="button" onClick={() => loadDashboard(true)} className="font-semibold underline">Retry</button>
          </div>
        )}

        {loading ? <DashboardSkeleton /> : dashboard ? (
          <>
            <section data-reveal-stagger aria-label="Client overview" className="mb-9 grid gap-4 sm:grid-cols-3">
              <SummaryCard label="Assigned projects" value={stats.totalProjects ?? 0} note="Projects assigned to your account" accent="text-[#203a2d]" />
              <SummaryCard label="Feedback submitted" value={stats.submittedThisWeek ?? 0} note="For this ISO week" accent="text-emerald-700" />
              <SummaryCard label="Feedback pending" value={stats.pendingFeedback ?? 0} note="Projects still awaiting this week’s feedback" accent="text-amber-700" />
            </section>
            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-xl font-semibold text-[#203a2d]">Your projects</h2>
                  <p className="mt-1 text-sm text-[#718074]">Health, timeline, and weekly feedback status</p>
                </div>
                <span className="text-sm text-[#718074]">{projects.length} {projects.length === 1 ? "project" : "projects"}</span>
              </div>
              {projects.length === 0 ? (
                <div data-reveal className="rounded-2xl border border-dashed border-[#cbd6c9] bg-white px-6 py-14 text-center">
                  <p className="text-lg font-semibold text-[#203a2d]">No projects assigned to you yet</p>
                  <p className="mt-2 text-sm text-[#718074]">Projects assigned to your account will appear here.</p>
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                  {projects.map((project) => <ProjectCard key={project._id} project={project} />)}
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </ClientShell>
  );
}
