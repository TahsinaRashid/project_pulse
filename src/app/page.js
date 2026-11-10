"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "../../app/components/UiEffects";

const statusStyles = {
  ON_TRACK: "bg-emerald-100 text-emerald-700",
  AT_RISK: "bg-amber-100 text-amber-700",
  CRITICAL: "bg-rose-100 text-rose-700",
  COMPLETED: "bg-sky-100 text-sky-700",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function HomePage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setRefreshing(true);
      setLoadError("");
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load dashboard data.");
        if (!cancelled) setDashboard(data);
      } catch (error) {
        console.error("Dashboard fetch failed", error);
        if (!cancelled) setLoadError("Dashboard data could not be loaded. Try refreshing.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [router, refreshVersion]);

  const user = dashboard?.user;
  const projects = dashboard?.projects || [];
  const activities = dashboard?.activities || [];
  const risks = dashboard?.risks || [];
  const checkins = dashboard?.checkins || [];
  const feedback = dashboard?.feedback || [];
  const stats = dashboard?.stats || {};
  const projectNames = Object.fromEntries(projects.map((project) => [project._id, project.name]));
  const role = user?.role;
  const roleMetric = role === "CLIENT"
    ? { label: "Client rating", value: stats.averageClientRating == null ? "—" : `${stats.averageClientRating} / 5` }
    : role === "EMPLOYEE"
      ? { label: "Team check-ins", value: stats.checkInCount ?? 0 }
      : { label: "Open risks", value: stats.openRisks ?? 0 };

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" })
      .finally(() => router.replace("/login"));
  };

  if (loading) {
    return (
      <div aria-label="Loading project dashboard" className="min-h-screen bg-slate-100 p-6 text-slate-600 md:p-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-28 rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-28 rounded-2xl" />)}</div>
          <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 md:p-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">Project Pulse · {role}</p>
            <h1 className="mt-2 text-3xl font-bold">{role === "CLIENT" ? "Your project overview" : role === "EMPLOYEE" ? "Your delivery workspace" : "Project overview"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {user.name}
            </div>
            <button
              type="button"
              onClick={() => setRefreshVersion((version) => version + 1)}
              disabled={refreshing}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "Refresh data"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Log out
            </button>
          </div>
        </header>

        {loadError && (
          <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span>{loadError}</span>
            <button type="button" onClick={() => setRefreshVersion((version) => version + 1)} className="font-semibold underline">Retry</button>
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">{role === "ADMIN" ? "Total projects" : "Assigned projects"}</p>
            <div className="mt-4 text-3xl font-bold">{stats.totalProjects ?? 0}</div>
            <p className="mt-2 text-xs text-slate-500">{stats.activeProjects ?? 0} active</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Projects at risk</p>
            <div className="mt-4 text-3xl font-bold text-amber-600">{stats.atRiskProjects ?? 0}</div>
            <p className="mt-2 text-xs text-slate-500">At-risk or critical status</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Average health</p>
            <div className="mt-4 text-3xl font-bold text-emerald-600">{stats.averageHealthScore ?? 0}%</div>
            <p className="mt-2 text-xs text-slate-500">Across visible projects</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">{roleMetric.label}</p>
            <div className="mt-4 text-3xl font-bold text-slate-800">{roleMetric.value}</div>
            <p className="mt-2 text-xs text-slate-500">{role === "CLIENT" ? `${stats.flaggedFeedback ?? 0} flagged updates` : role === "EMPLOYEE" ? `Average confidence ${stats.averageConfidence ?? "—"} / 5` : "Across your projects"}</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Projects</h2>
              <span className="text-sm text-slate-500">Live health scores</span>
            </div>

            <div className="space-y-4">
              {projects.length === 0 ? (
                <p className="text-slate-500">No projects found yet.</p>
              ) : (
                projects.map((project) => (
                  <article key={project._id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{project.name}</h3>
                        <p className="text-sm text-slate-500">{project.description || "No description provided"}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[project.status] || "bg-slate-100 text-slate-600"}`}>
                        {project.status || "ON_TRACK"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Health score</p>
                        <p className="mt-1 text-2xl font-bold">{project.healthScore ?? 100}%</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Start</p>
                        <p className="mt-1 text-sm font-medium">{formatDate(project.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">End</p>
                        <p className="mt-1 text-sm font-medium">{formatDate(project.endDate)}</p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Recent activity</h2>
              {dashboard?.refreshedAt && <span className="text-xs text-slate-400">Updated {new Date(dashboard.refreshedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>}
            </div>
            <div className="space-y-3">
              {activities.length === 0 ? (
                <p className="text-slate-500">No recent activity.</p>
              ) : (
                activities.slice(0, 8).map((activity) => (
                  <div key={activity._id} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-700">{activity.type}</p>
                    <p className="mt-1 text-sm text-slate-500">{activity.description}</p>
                    <p className="mt-2 text-xs text-slate-400">{formatDate(activity.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </aside>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Delivery risks</h2>
              <span className="text-xs text-slate-500">{stats.openRisks ?? 0} open</span>
            </div>
            <div className="space-y-3">
              {risks.filter((risk) => risk.status === "OPEN").length === 0 ? (
                <p className="text-sm text-slate-500">No open risks for these projects.</p>
              ) : risks.filter((risk) => risk.status === "OPEN").slice(0, 5).map((risk) => (
                <article key={risk._id} className="border-l-2 border-amber-400 pl-3">
                  <p className="text-sm font-semibold text-slate-800">{risk.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{projectNames[String(risk.projectId)] || "Project"} · {risk.severity} priority</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Latest check-ins</h2>
              <span className="text-xs text-slate-500">{stats.checkInCount ?? 0} recorded</span>
            </div>
            <div className="space-y-3">
              {checkins.length === 0 ? (
                <p className="text-sm text-slate-500">No check-ins have been submitted yet.</p>
              ) : checkins.slice(0, 5).map((checkin) => (
                <article key={checkin._id} className="border-l-2 border-emerald-400 pl-3">
                  <p className="text-sm font-semibold text-slate-800">{projectNames[String(checkin.projectId)] || "Project"}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{checkin.progressSummary || "Progress update submitted"}</p>
                  <p className="mt-1 text-xs text-slate-400">{checkin.completionPercentage ?? 0}% complete · confidence {checkin.confidenceLevel ?? "—"}/5</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Client feedback</h2>
              <span className="text-xs text-slate-500">Average {stats.averageClientRating ?? "—"}/5</span>
            </div>
            <div className="space-y-3">
              {feedback.length === 0 ? (
                <p className="text-sm text-slate-500">No client feedback has been submitted yet.</p>
              ) : feedback.slice(0, 5).map((item) => (
                <article key={item._id} className={`border-l-2 pl-3 ${item.issueFlagged ? "border-rose-400" : "border-sky-400"}`}>
                  <p className="text-sm font-semibold text-slate-800">{projectNames[String(item.projectId)] || "Project"}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.comments || "Feedback submitted"}</p>
                  <p className="mt-1 text-xs text-slate-400">Satisfaction {item.satisfactionRating ?? "—"}/5{item.issueFlagged ? " · issue flagged" : ""}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
