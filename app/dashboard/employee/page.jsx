"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ProjectCard({ project }) {
  return (
    <Link
      href={`/dashboard/employee/projects/${project._id}`}
      className="group block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-800">{project.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{project.description || "No project description provided."}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[project.status] || statusStyles.AT_RISK}`}>
          {statusLabels[project.status] || "At Risk"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Health score</p>
          <p className="mt-1 text-xl font-bold text-slate-800">{project.healthScore ?? 0}<span className="text-sm font-medium text-slate-400"> / 100</span></p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Completion</p>
          <p className="mt-1 text-xl font-bold text-slate-800">{project.completionPercentage ?? 0}%</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Timeline</p>
          <p className="mt-2 text-sm font-medium text-slate-700">{formatDate(project.startDate)} <span className="text-slate-400">to</span> {formatDate(project.endDate)}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className={`inline-flex items-center gap-2 text-sm font-medium ${project.checkInDone ? "text-emerald-700" : "text-amber-700"}`}>
          <span className={`h-2 w-2 rounded-full ${project.checkInDone ? "bg-emerald-500" : "bg-amber-500"}`} />
          This week: {project.checkInDone ? "Check-in done" : "Check-in pending"}
        </span>
        <span className="text-sm font-semibold text-slate-500 group-hover:text-emerald-700">View project <span aria-hidden="true">→</span></span>
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-label="Loading employee dashboard" className="animate-pulse space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((item) => <div key={item} className="h-28 rounded-2xl bg-white ring-1 ring-slate-200" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {[1, 2].map((item) => <div key={item} className="h-56 rounded-2xl bg-white ring-1 ring-slate-200" />)}
      </div>
    </div>
  );
}

export default function EmployeeDashboardPage() {
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
      const response = await fetch("/api/employee/dashboard", { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load your dashboard.");
      setDashboard(data);
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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const stats = dashboard?.stats || {};
  const projects = dashboard?.projects || [];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-900 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Project Pulse · Employee</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Your delivery workspace</h1>
            {dashboard?.user && <p className="mt-1 text-sm text-slate-500">Welcome back, {dashboard.user.name}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => loadDashboard()} disabled={refreshing} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button type="button" onClick={handleLogout} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700">
              Log out
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span>{error}</span>
            <button type="button" onClick={() => loadDashboard(true)} className="font-semibold underline">Retry</button>
          </div>
        )}

        {loading ? <DashboardSkeleton /> : dashboard ? (
          <>
            <section aria-label="Employee overview" className="mb-8 grid gap-4 sm:grid-cols-3">
              <SummaryCard label="Assigned projects" value={stats.totalProjects ?? 0} description="Projects on your delivery roster" accent="text-slate-900" />
              <SummaryCard label="Pending check-ins" value={stats.pendingCheckins ?? 0} description="Due for the current ISO week" accent="text-amber-700" />
              <SummaryCard label="Open risks" value={stats.openRisks ?? 0} description="Across your assigned projects" accent="text-rose-700" />
            </section>

            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-xl font-semibold">Assigned projects</h2>
                  <p className="mt-1 text-sm text-slate-500">Project health and weekly check-in status</p>
                </div>
                <span className="text-sm text-slate-500">{projects.length} {projects.length === 1 ? "project" : "projects"}</span>
              </div>
              {projects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                  <p className="text-lg font-semibold text-slate-800">No projects assigned yet</p>
                  <p className="mt-2 text-sm text-slate-500">When a project is assigned to you, it will appear here.</p>
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                  {projects.map((project) => <ProjectCard key={project._id} project={project} />)}
                </div>
              )}
            </section>
          </>
        ) : null}

        <footer className="mt-10 border-t border-slate-200 py-5 text-center text-xs text-slate-500">
          Project Pulse · Your team’s project health, in one place.
        </footer>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, description, accent }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-bold ${accent}`}>{value}</p>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}
